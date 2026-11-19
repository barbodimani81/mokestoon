package config

import "testing"

func TestListenAddress(t *testing.T) {
	for _, addr := range []string{"localhost:1234", "[::1]:65535", ""} {
		t.Setenv("HTTP_ADDR", addr)
		got, err := ListenAddress()
		if addr == "" {
			addr = "127.0.0.1:8080"
		}
		if err != nil || got != addr {
			t.Fatalf("got %q, %v", got, err)
		}
	}
	for _, addr := range []string{"localhost", "127.0.0.1:0", ":65536", ":abc"} {
		t.Setenv("HTTP_ADDR", addr)
		if _, err := ListenAddress(); err == nil {
			t.Errorf("accepted %q", addr)
		}
	}
}
