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

`lego run` obtains the certificate on the first run and renews it on later
runs when due, so the first real issuance is simply:

```bash
sudo systemctl start lego.service && journalctl -u lego
```

The files land in `/var/config/lego/certificates/reihungen.de.{crt,key,issuer.crt,json}`.
Consumers mount that directory read-only. Renewal runs from `lego.timer` (see System).

To add another domain, append it as `--domains` in `lego.container`, add
`--renew-force` once, start the service, then remove the flag again.

### pihole

The web password comes from a secret:

```bash
printf "*****" | sudo podman secret create pihole_password -
```

### photo (photoprism + mariadb)

Photoprism, its MariaDB and the `photo.network` live in `containers/photo/`.
Admin and database passwords come from secrets:

```bash
printf "*****" | sudo podman secret create photoprism_password -
printf "*****" | sudo podman secret create photoprism_db_password -
printf "*****" | sudo podman secret create photoprism_mariadb_root_password -
```

`photoprism_db_password` is shared by both containers. When migrating an
existing installation, use the passwords the database was created with.

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

### lego.timer

```bash
sudo systemctl enable --now lego.timer
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






