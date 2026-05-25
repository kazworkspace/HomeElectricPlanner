# Certbot & Let's Encrypt — Complete Guide

## What is Certbot?

Certbot is a free, open-source tool by the Electronic Frontier Foundation (EFF) that automates obtaining and renewing SSL/TLS certificates from **Let's Encrypt**.

Let's Encrypt is a free, automated, and open Certificate Authority (CA) run by the nonprofit **Internet Security Research Group (ISRG)**.

---

## Why Is It Free?

Let's Encrypt is funded by major tech companies and organizations:

| Sponsor | Role |
|---------|------|
| Mozilla | Founding sponsor |
| Google (Chrome) | Major sponsor |
| Electronic Frontier Foundation | Co-founder |
| Cisco | Platinum sponsor |
| Amazon (AWS) | Major sponsor |

**Mission:** Encrypt the entire web. If HTTPS is free and automatic, more websites use it → safer internet for everyone.

They earn nothing from issuing certs. Revenue comes from donations and sponsorships, not users.

---

## What Data Is Sent to Let's Encrypt?

### Sent:
| Data | Purpose |
|------|---------|
| Domain name (`yourdomain.com`) | Verify you own the domain |
| Server IP address | From the ACME challenge HTTP request |
| Email address | Expiry warning notifications only |

### NOT Sent:
- Private key — generated locally, never leaves your server
- Website traffic or content
- User data or passwords
- Any application data

### How Domain Ownership is Verified (ACME Protocol):

```
1. Certbot generates key pair locally on your server
2. Certbot contacts Let's Encrypt: "I want a cert for yourdomain.com"
3. Let's Encrypt responds: "Place this token at:
      http://yourdomain.com/.well-known/acme-challenge/<token>"
4. Certbot writes token to /var/www/certbot/ (or nginx serves it)
5. Let's Encrypt fetches that URL from the internet
6. Token found → domain ownership confirmed → cert issued
7. Token deleted automatically
```

Your **private key is generated and stored on your server only**. Let's Encrypt never sees it.

---

## Certificate Details

| Property | Value |
|----------|-------|
| Cost | Free |
| Validity | 90 days |
| Auto-renewal | Yes (at 60 days, 30 days before expiry) |
| Wildcard support | Yes (`*.yourdomain.com`) |
| Trusted by | All major browsers and OS |

The 90-day expiry is intentional — short lifetimes limit damage if a cert is compromised, and encourage automation.

---

## Prerequisites

Before installing certbot:

- Ubuntu/Debian server (or any Linux)
- Domain with DNS A record pointing to your server IP
- Port **80** open on firewall (needed for ACME challenge)
- Port **443** open on firewall (for HTTPS traffic)
- Nginx installed and running

Verify DNS is propagated before running certbot:
```bash
nslookup yourdomain.com
# or
dig yourdomain.com
```

---

## Installation

### Install Certbot + Nginx Plugin

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### Update Nginx Server Name

Certbot needs `server_name` set to your actual domain (not `_`):

```bash
sudo nano /etc/nginx/sites-available/your-site
```

Change:
```nginx
server_name _;
```

To:
```nginx
server_name yourdomain.com;
```

Test and reload nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Obtain Certificate

```bash
sudo certbot --nginx -d yourdomain.com --email you@email.com --agree-tos --no-eff-email
```

Flags:
- `--nginx` — auto-edits nginx config to use new cert
- `-d` — domain to certify
- `--email` — for expiry notifications
- `--agree-tos` — accept Let's Encrypt Terms of Service
- `--no-eff-email` — opt out of EFF mailing list

Certbot will:
1. Verify domain ownership via ACME challenge
2. Issue certificate to `/etc/letsencrypt/live/yourdomain.com/`
3. Automatically update nginx config to point to new cert paths
4. Reload nginx

### Verify Certificate

```bash
sudo certbot certificates
```

Output shows domain, expiry date, and cert path.

---

## Certificate File Locations

After successful issuance:

```
/etc/letsencrypt/live/yourdomain.com/
├── fullchain.pem   ← certificate + intermediate chain (use this in nginx)
├── privkey.pem     ← private key
├── cert.pem        ← certificate only
└── chain.pem       ← intermediate chain only
```

Nginx uses `fullchain.pem` and `privkey.pem`.

---

## Auto-Renewal

Certbot installs a systemd timer that runs renewal checks automatically:

```bash
# Check timer status
sudo systemctl status certbot.timer

# Test renewal without actually renewing
sudo certbot renew --dry-run
```

Renewal runs **twice daily**. Cert only renews when within 30 days of expiry (at 60-day mark).

---

## Disabling & Removing Certbot

### Stop Auto-Renewal Only

```bash
sudo systemctl stop certbot.timer
sudo systemctl disable certbot.timer
```

### Revoke Certificate

Tells Let's Encrypt the cert is no longer valid. Do this if:
- Domain is being transferred
- Private key may have been compromised
- Domain is being abandoned

```bash
sudo certbot revoke --cert-name yourdomain.com
```

### Delete Certificate Files

Removes cert files from server without revoking:

```bash
sudo certbot delete --cert-name yourdomain.com
```

### Full Cleanup (Revoke + Delete + Uninstall)

```bash
# 1. Revoke cert
sudo certbot revoke --cert-name yourdomain.com

# 2. Delete cert files
sudo certbot delete --cert-name yourdomain.com

# 3. Stop and disable timer
sudo systemctl stop certbot.timer
sudo systemctl disable certbot.timer

# 4. Uninstall certbot
sudo apt remove certbot python3-certbot-nginx -y
sudo apt autoremove -y
```

---

## Troubleshooting

### Port 80 Not Open
```bash
# Check firewall (ufw)
sudo ufw status

# Allow port 80
sudo ufw allow 80
sudo ufw allow 443
```

### DNS Not Propagated
```bash
# Check A record
dig yourdomain.com A +short
# Must return your server IP before running certbot
```

### Nginx Config Error
```bash
sudo nginx -t
sudo journalctl -u nginx --no-pager -n 50
```

### View Certbot Logs
```bash
sudo cat /var/log/letsencrypt/letsencrypt.log
```

---

## Summary

| Topic | Detail |
|-------|--------|
| Cost | Free forever |
| Org | Let's Encrypt / ISRG (nonprofit) |
| Cert validity | 90 days |
| Auto-renewal | Yes, via systemd timer |
| Data sent | Domain name, email, server IP only |
| Private key | Never leaves your server |
| Revoke | `certbot revoke --cert-name domain` |
| Delete | `certbot delete --cert-name domain` |
| Uninstall | `apt remove certbot python3-certbot-nginx` |
