# Reverse proxy (host nginx, behind Cloudflare)

The one public-facing piece. nginx runs on the **host** (rootless Podman can't bind 80/443) and proxies to the
loopback-bound containers, so Postgres/RabbitMQ/minio/Hasura/OCPP are never exposed directly. Config:
[`voltu.conf`](voltu.conf).

Recommended fronting: **Cloudflare** terminates public TLS, hides the origin IP, and adds DDoS/WAF + identity-
based access. The origin only accepts Cloudflare.

## Install nginx

```bash
sudo dnf install -y nginx
sudo mkdir -p /etc/nginx/ssl
sudo cp ~/citrineos-core/infra/reverse-proxy/voltu.conf /etc/nginx/conf.d/voltu.conf
sudo $EDITOR /etc/nginx/conf.d/voltu.conf     # set your domains + the dashboard allow-list IP(s)
sudo setsebool -P httpd_can_network_connect 1 # SELinux: let nginx reach the loopback ports
```

## Cloudflare (recommended)

1. **DNS** (Cloudflare dashboard → DNS): add `app`, `ocpp`, `proxy` records → the box public IP, **proxied
   (orange cloud)**. (For OCPP chargers using mutual-TLS / security profile 3, make `ocpp` **DNS-only / grey
   cloud** so they reach the origin directly — Cloudflare's TLS termination breaks mTLS.)
2. **SSL/TLS mode:** SSL/TLS → Overview → **Full (Strict)**.
3. **Origin cert:** SSL/TLS → Origin Server → Create Certificate. Save the cert to
   `/etc/nginx/ssl/cloudflare-origin.pem` and the key to `/etc/nginx/ssl/cloudflare-origin.key` (chmod 600).
4. **Lock the origin to Cloudflare only** — the box firewall accepts 443 from Cloudflare IP ranges only, so
   nobody can bypass Cloudflare by hitting the IP. firewalld:
   ```bash
   for cidr in $(curl -s https://www.cloudflare.com/ips-v4) $(curl -s https://www.cloudflare.com/ips-v6); do
     sudo firewall-cmd --permanent --add-rich-rule="rule family=${cidr##*:*/} source address=$cidr port port=443 protocol=tcp accept" 2>/dev/null || \
     sudo firewall-cmd --permanent --add-rich-rule="rule source address=$cidr port port=443 protocol=tcp accept"
   done
   sudo firewall-cmd --permanent --add-service=ssh
   sudo firewall-cmd --reload
   ```
   (Also set the Oracle VCN security list to allow 443 only from Cloudflare's ranges + 22 from your IP.)
5. **Whitelist the dashboard by identity — Cloudflare Access** (Zero Trust → Access → Applications): add
   `app.voltu.energy`, policy = allow your team's emails (Google/GitHub/OTP). This beats IP allow-listing for a
   roaming team; the nginx `allow/deny` in `voltu.conf` stays as origin-side defense-in-depth.

```bash
sudo nginx -t && sudo systemctl enable --now nginx
sudo systemctl reload nginx   # after any config edit
```

## Not using Cloudflare (Let's Encrypt at the box)

Point DNS straight at the box, open 80+443 (firewalld + Oracle security list), then:
```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.voltu.energy -d ocpp.voltu.energy -d proxy.voltu.energy
```
In `voltu.conf`, swap the `cloudflare-origin.*` cert paths for the certbot `/etc/letsencrypt/live/...` paths,
delete the `set_real_ip_from`/`real_ip_header` block, and keep the dashboard `allow/deny` for the whitelist.

## Admin surfaces (never public, either way)

Postgres / RabbitMQ console / minio console are not proxied. Reach them over an SSH tunnel:
```bash
ssh -L 15672:127.0.0.1:15672 -L 9001:127.0.0.1:9001 user@box   # then browse http://127.0.0.1:15672
```
