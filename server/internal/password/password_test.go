package password

import (
	"errors"
	"testing"
)

func TestHashAndVerify(t *testing.T) {
	hash, err := Hash("correct horse")
	if err != nil {
		t.Fatal(err)
	}

	ok, err := Verify("correct horse", hash)
	if err != nil || !ok {
		t.Fatalf("Verify(correct) = %v, %v; want true, nil", ok, err)
	}

	ok, err = Verify("wrong horse", hash)
	if err != nil || ok {
		t.Fatalf("Verify(wrong) = %v, %v; want false, nil", ok, err)
	}
}

func TestHashUsesRandomSalt(t *testing.T) {
	a, _ := Hash("same")
	b, _ := Hash("same")
	if a == b {
		t.Fatal("two hashes of the same password are identical; salt is not random")
	}
}

func TestVerifyMalformed(t *testing.T) {
	for _, encoded := range []string{
		"",
		"plaintext",
		"$bcrypt$v=19$m=1,t=1,p=1$c2FsdA$aGFzaA",
		"$argon2id$v=19$m=x,t=1,p=1$c2FsdA$aGFzaA",
		"$argon2id$v=19$m=1,t=1,p=1$!!!$aGFzaA",
	} {
		if _, err := Verify("pw", encoded); !errors.Is(err, ErrMalformedHash) {
			t.Errorf("Verify(%q) error = %v; want ErrMalformedHash", encoded, err)
		}
	}
}
