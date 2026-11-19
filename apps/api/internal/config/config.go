package config

import (
	"errors"
	"net"
	"os"
	"strconv"
)

func ListenAddress() (string, error) {
	addr := os.Getenv("HTTP_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8080"
	}
	_, port, err := net.SplitHostPort(addr)
	n, parseErr := strconv.Atoi(port)
	if err != nil || parseErr != nil || n < 1 || n > 65535 {
		return "", errors.New("HTTP_ADDR must contain a host and a valid TCP port")
	}
	return addr, nil
}
