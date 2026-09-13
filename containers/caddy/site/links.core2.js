// Hub links for core2 (192.168.2.14). Deployed to /var/config/caddy/site/links.js
// icon: file name in site/icons/ without .svg (optional), desc: optional
window.HUB = {
  host: "core2",
  ip: "192.168.2.14",
  other: { name: "core1", url: "https://core1.reihungen.de" },
  services: [
    { name: "Jellyfin",   url: "https://jellyfin.reihungen.de",   icon: "jellyfin",   desc: "Media server" },
    { name: "Jellyseerr", url: "https://jellyseerr.reihungen.de", icon: "jellyseerr", desc: "Media requests" },
    { name: "Radarr",     url: "https://radarr.reihungen.de",     icon: "radarr",     desc: "Movies" },
    { name: "Sonarr",     url: "https://sonarr.reihungen.de",     icon: "sonarr",     desc: "Series" },
    { name: "Prowlarr",   url: "https://prowlarr.reihungen.de",   icon: "prowlarr",   desc: "Indexers" },
    { name: "SABnzbd",    url: "https://sabnzbd.reihungen.de",    icon: "sabnzbd",    desc: "Downloads" },
  ],
};
