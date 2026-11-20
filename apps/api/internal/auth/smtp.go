package auth

import (
	"context"
	"fmt"
	"mime"
	"net"
	"net/smtp"
	"time"
)

// LocalMailbox is the development SMTP transport. The configuration restricts
// its address to a loopback IP. Messages never need an external mail service.
type LocalMailbox struct{ Address, WebOrigin string }

func (m LocalMailbox) Send(ctx context.Context, to string, p Purpose, token string) error {
	conn, err := (&net.Dialer{Timeout: 3 * time.Second}).DialContext(ctx, "tcp", m.Address)
	if err != nil {
		return err
	}
	defer conn.Close()
	if err = conn.SetDeadline(time.Now().Add(4 * time.Second)); err != nil {
		return err
	}
	host, _, err := net.SplitHostPort(m.Address)
	if err != nil {
		return err
	}
	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer client.Close()
	const from = "accounts@f7.test"
	if err = client.Mail(from); err != nil {
		return err
	}
	if err = client.Rcpt(to); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	subject := "تأیید حساب F7"
	if p == Reset {
		subject = "بازیابی رمز حساب F7"
	}
	body := fmt.Sprintf("%s\r\n\r\n%s/account.html#%s=%s\r\n\r\nاین پیوند تا ۲۰ دقیقه اعتبار دارد.", subject, m.WebOrigin, p, token)
	if token == "" {
		subject = "درخواست حساب F7"
		body = "برای ساخت حساب یا بازیابی دسترسی، این صفحه را باز کن: " + m.WebOrigin + "/account.html"
	}
	_, err = fmt.Fprintf(w, "From: F7 <%s>\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s\r\n", from, to, mime.QEncoding.Encode("utf-8", subject), body)
	if err != nil {
		return err
	}
	return w.Close()
}
