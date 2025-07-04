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






