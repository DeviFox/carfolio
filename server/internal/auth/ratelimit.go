package auth

import (
	"sync"
	"time"
)

// limiter allows up to limit hits per key within a fixed time window.
// It lives in memory, which is enough for a single server instance.
type limiter struct {
	mu     sync.Mutex
	limit  int
	window time.Duration
	hits   map[string]*bucket
}

type bucket struct {
	count int
	start time.Time
}

func newLimiter(limit int, window time.Duration) *limiter {
	return &limiter{limit: limit, window: window, hits: make(map[string]*bucket)}
}

func (l *limiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	if len(l.hits) > 10_000 {
		l.purge(now)
	}

	b, ok := l.hits[key]
	if !ok || now.Sub(b.start) > l.window {
		l.hits[key] = &bucket{count: 1, start: now}
		return true
	}
	b.count++
	return b.count <= l.limit
}

func (l *limiter) Reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.hits, key)
}

// purge drops expired buckets so the map does not grow without bound.
// Caller must hold l.mu.
func (l *limiter) purge(now time.Time) {
	for k, b := range l.hits {
		if now.Sub(b.start) > l.window {
			delete(l.hits, k)
		}
	}
}
