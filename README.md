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

### pihole

Lives in `containers/pihole/`. The web password comes from a secret:

```bash
printf "*****" | sudo podman secret create pihole_password -
```

`custom.list` holds the local DNS records for all `*.reihungen.de` hostnames
so that they resolve to core1/core2 inside the home network instead of the
public wildcard. Deploy it and reload:

```bash
sudo cp custom.list /var/lib/pihole/pihole/custom.list
sudo podman exec systemd-pihole pihole restartdns
```

The web UI is only published on `127.0.0.1:8888` and reached through caddy as
`pihole.reihungen.de`.

### photo (photoprism + mariadb)

Photoprism, its MariaDB and the `photo.network` live in `containers/photo/`.
The database is only reachable inside `photo.network`, so its credentials
are kept inline. Only the admin password is a secret:

```bash
printf "*****" | sudo podman secret create photoprism_password -
```

### caddy

Reverse proxy with the lego certificate, one instance per host. The unit is
identical on both hosts; only the Caddyfile differs. Uses host networking and
proxies to the ports the services publish on localhost.

```bash
sudo mkdir -p /var/config/caddy /etc/containers/systemd/caddy
sudo cp caddy.container /etc/containers/systemd/caddy/
sudo cp Caddyfile.core1 /var/config/caddy/Caddyfile   # or Caddyfile.core2
sudo cp ../../system/caddy-reload.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start caddy.service
sudo systemctl enable --now caddy-reload.path
```

`caddy-reload.path` watches the lego certificate and reloads caddy after a
renewal. Adding a service means: a site block in the host's Caddyfile, a line
in `pihole/custom.list`, then

```bash
sudo podman exec caddy caddy reload --config /etc/caddy/Caddyfile
```

| Host  | Hostnames (`*.reihungen.de`)                                  |
|-------|---------------------------------------------------------------|
| core1 | home, paperless, photos, pihole, spoolman                     |
| core2 | jellyfin, jellyseerr, radarr, sonarr, prowlarr, sabnzbd       |

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






