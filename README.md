# HomeLab

Collection of configuration files

## Containers

Belongs in /etc/containers/systemd/

### gluetun

If the wireguard kernel module is not loaded:
```bash
sudo -i

echo "wireguard" > /etc/modules-load.d/wireguard.conf
```


```bash
sudo mkdir -p /var/config/gluetun

```bash
printf "*****************" | sudo podman secret create wireguard_private_key -
printf "*****************" | sudo podman secret create wireguard_preshared_key -
printf "12.34.56.78/32" | sudo podman secret create wireguard_addresses -
```

#### Speed test
```bash
sudo podman run --network container:gluetun --rm python bash -c "curl -s https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py | python -"
```

### lego

Obtains one Let's Encrypt wildcard certificate for `reihungen.de` and `lügen.eu`
via the DNS-01 challenge on INWX. `xn--lgen-0ra.eu` is the punycode form of
`lügen.eu`; lego does not convert IDNs itself.

```bash
sudo mkdir -p /var/config/lego

printf "inwx-user" | sudo podman secret create inwx_username -
printf "inwx-pass" | sudo podman secret create inwx_password -
```

Optional: test the INWX credentials against the staging CA first. This uses a
separate data directory, so nothing needs to be cleaned up afterwards:

```bash
sudo podman run --rm -it \
  --secret inwx_username,type=env,target=INWX_USERNAME \
  --secret inwx_password,type=env,target=INWX_PASSWORD \
  -v /var/config/lego-staging:/.lego:Z \
  docker.io/goacme/lego:latest \
  run --server letsencrypt-staging \
  --accept-tos --email raphael.grund@gmail.com --path /.lego --dns inwx \
  --domains reihungen.de --domains '*.reihungen.de' \
  --domains xn--lgen-0ra.eu --domains '*.xn--lgen-0ra.eu'
sudo rm -rf /var/config/lego-staging
```

lego runs on **both** hosts (core1 and core2), each with its own copy of the
secrets and its own certificate. `lego run` obtains the certificate on the
first run and renews it on later runs when due, so the first real issuance is
simply:

```bash
sudo systemctl start lego.service && journalctl -u lego
```

The files land in `/var/config/lego/certificates/reihungen.de.{crt,key,issuer.crt,json}`.
Consumers mount that directory read-only. Renewal runs from `lego.timer` (see System).

To add another domain, append it as `--domains` in `lego.container`, add
`--renew-force` once, start the service, then remove the flag again.

### adguard

AdGuard Home lives in `containers/adguard/`. It is the DNS server for the home
network on `192.168.2.13:53`, forwards to Quad9 over DoT and blocks with
OISD big plus HaGeZi Threat Intelligence Feeds (about 2.3 million rules, allow
300 to 400 MB RAM).

`AdGuardHome.yaml` is the whole configuration. Shipping it skips the first-run
wizard. The web password is a bcrypt hash in that file, not a podman secret;
the repo copy holds a placeholder, the real hash goes into the deployed file only:

```bash
sudo mkdir -p /var/config/adguard /var/lib/adguard
sudo cp AdGuardHome.yaml /var/config/adguard/AdGuardHome.yaml
sudo podman exec caddy caddy hash-password          # paste the password, copy the $2a$... hash
sudo sed -i 's|\$2a\$14\$REPLACE_WITH_BCRYPT_HASH|<hash>|' /var/config/adguard/AdGuardHome.yaml
sudo systemctl restart adguard
```

AdGuard fills in every key missing from the file with its default and rewrites
it on start. Diff `/var/config/adguard/AdGuardHome.yaml` against the repo copy
after the first boot and after any change made in the UI.

The local A records for all `*.reihungen.de` hostnames are `filtering.rewrites`
in `AdGuardHome.yaml`, so they resolve to core1/core2 inside the home network
instead of the public wildcard. A rewrite with only an A answer makes AAAA
queries return an empty NOERROR instead of the public wildcard CNAME, no
dnsmasq workaround needed. Check with
`dig @192.168.2.13 AAAA jellyfin.reihungen.de` (NOERROR, no answer section).

Clients that cached the public answer need a flush, e.g. `resolvectl flush-caches`.

The web UI is only published on `127.0.0.1:8888` and reached through caddy as
`adguard.reihungen.de`.

Replaced pihole in October 2026. The pihole data is still in
`/var/lib/pihole/` and `/var/lib/pihole-backup-v5-*.tar.gz` on core1 until
AdGuard has proven itself; `adguard.container` has `Conflicts=pihole.service`
so both never bind port 53 at once.

### photo (photoprism + mariadb)

Photoprism, its MariaDB and the `photo.network` live in `containers/photo/`.
The database is only reachable inside `photo.network`, so its credentials
are kept inline. Only the admin password is a secret:

```bash
printf "*****" | sudo podman secret create photoprism_password -
```

### caddy

Reverse proxy with the lego certificate, one instance per host. The unit is
identical on both hosts; only the Caddyfile and the hub links differ. Uses host
networking and proxies to the ports the services publish on localhost.

`site/` is a small static hub page served as `core1.reihungen.de` /
`core2.reihungen.de`: `index.html` (shared), `links.<host>.js` (the list of
services, deployed as `links.js`) and `icons/` (SVG logos, see
`icons/README.md`).

First deploy (example core1, use `core2` files on core2):

```bash
sudo mkdir -p /var/config/caddy/site /etc/containers/systemd/caddy
sudo cp Caddyfile.core1 /var/config/caddy/Caddyfile
sudo cp -r site/index.html site/icons /var/config/caddy/site/
sudo cp site/links.core1.js /var/config/caddy/site/links.js
sudo cp caddy.container /etc/containers/systemd/caddy/
sudo cp ../../system/caddy-reload.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start caddy.service
sudo systemctl enable --now caddy-reload.path
```

Use `cp`, not `mv` from `/tmp`: a moved file keeps its `user_tmp_t` SELinux
label and caddy answers 403.

What needs what after a change:

| Changed file          | Action                                                        |
|-----------------------|---------------------------------------------------------------|
| `Caddyfile.<host>`    | copy, then `sudo systemctl start caddy-reload.service`        |
| `site/*`              | copy only, served live                                        |
| `caddy.container`     | copy, `daemon-reload`, `systemctl restart caddy.service`      |
| lego certificate      | nothing, `caddy-reload.path` reloads caddy automatically      |

Adding a service:

1. `Caddyfile.<host>`: new site block with `import cert` and `reverse_proxy`
2. `../adguard/AdGuardHome.yaml`: new `filtering.rewrites` entry
   `domain: name.reihungen.de`, `answer: 192.168.2.1x` (see adguard)
3. `site/links.<host>.js`: new entry, optional logo in `site/icons/`

| Host  | Hostnames (`*.reihungen.de`)                                  |
|-------|---------------------------------------------------------------|
| core1 | core1 (hub), home, paperless, photos, adguard, spoolman        |
| core2 | core2 (hub), jellyfin, jellyseerr, radarr, sonarr, prowlarr, sabnzbd, www.lügen.eu |

### luegen (www.lügen.eu)

Runs on core2 as a **rootless** container under its own system user `luegen`,
isolated from the root podman containers. The image comes from the `luegen.eu`
repo, data is one SQLite file. Hostnames are the punycode form
`xn--lgen-0ra.eu`; the lego certificate already covers them.

www.lügen.eu is the only site block in `Caddyfile.core2` without
`import lan_only`, so it is the only one reachable from the internet.

```bash
# user with subuid range and lingering user session
sudo useradd --create-home --comment "lügen.eu" luegen
sudo loginctl enable-linger luegen
sudo mkdir -p ~luegen/.config/containers/systemd ~luegen/data
sudo cp luegen.container ~luegen/.config/containers/systemd/
# Lies.sqlite from the old host (rockrack: /home/raphael/lugen/Lies.sqlite)
sudo cp Lies.sqlite ~luegen/data/
sudo chown -R luegen:luegen ~luegen

# everything below runs as the luegen user
sudo -u luegen bash -c 'export XDG_RUNTIME_DIR=/run/user/$(id -u)
printf "123456:bot-token-from-botfather" | podman secret create luegen_bot_token -
python3 -c "import secrets;print(secrets.token_urlsafe(32), end=\"\")" | podman secret create luegen_webhook_token -
systemctl --user daemon-reload && systemctl --user start luegen.service
podman exec luegen python -m app.set_webhook'
```

Then copy `caddy/Caddyfile.core2` and `sudo systemctl start caddy-reload.service`.

Updates: `sudo -u luegen XDG_RUNTIME_DIR=/run/user/$(id -u luegen) podman auto-update`.
Unknown Telegram users get their id in the bot reply; add it to `ADMIN_IDS`
in `luegen.container` to grant access.

### jellyfin prowlarr radarr sabnzbd sonarr

```bash
sudo mkdir -p /var/config/
cd /var/config/
sudo mkdir -p jellyfin prowlarr radarr sabnzbd sonarr
sudo chown 1000:1000 sonarr sabnzbd radarr prowlarr jellyfin
```

### sabnzbd

```bash
mkdir /var/mnt/media/.incomplete_downloads
mkdir /var/mnt/media/Downloads
```

## System

Belongs in /etc/systemd/system/

### var-mnt-media

```bash
sudo chown 1000:1000 /var/mnt/media/
```

### lego.timer and caddy-reload.path

```bash
sudo systemctl enable --now lego.timer
sudo systemctl enable --now caddy-reload.path
```

## Storage

### Add hdd

Add  the drive to the file system
```bash
# create physical volume
sudo pvcreate /dev/sd?
# add to volume group
sudo vgextend external /dev/sdc
# extend logical volume
sudo lvm lvextend -l +100%FREE /dev/mapper/external-media
# resize fs
sudo resize2fs /dev/mapper/external-media 
```

~The up spin down. Use a toolbox for hdparm~
```bash
sudo toolbox enter
dnf install hdparm -y
```






