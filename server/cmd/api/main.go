package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/DeviFox/carfolio/server/internal/auth"
	"github.com/DeviFox/carfolio/server/internal/config"
	"github.com/DeviFox/carfolio/server/internal/db"
	"github.com/DeviFox/carfolio/server/internal/garage"
	"github.com/DeviFox/carfolio/server/internal/httpx"
	"github.com/DeviFox/carfolio/server/internal/mailer"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(log); err != nil {
		log.Error("server stopped", "err", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool, log); err != nil {
		return err
	}

	authHandler, err := auth.NewHandler(auth.NewStore(pool), mailer.Log{Logger: log}, log, auth.Options{
		SecureCookie: cfg.CookieSecure,
		TrustProxy:   cfg.TrustProxy,
		AppURL:       cfg.AppURL,
	})
	if err != nil {
		return err
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := pool.Ping(ctx); err != nil {
			http.Error(w, "db unavailable", http.StatusServiceUnavailable)
			return
		}
		w.Write([]byte("ok"))
	})
	authHandler.Routes(mux)
	garage.NewHandler(garage.NewStore(pool), log).Routes(mux, authHandler.RequireUser)

	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           httpx.CORS(cfg.AllowedOrigins, httpx.CheckOrigin(cfg.AllowedOrigins, mux)),
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info("listening", "addr", cfg.HTTPAddr)
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-ctx.Done():
		log.Info("shutting down")
	}

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()
	return srv.Shutdown(shutdownCtx)
}
