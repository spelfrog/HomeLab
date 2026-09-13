// Hub links for core1 (192.168.2.13). Deployed to /var/config/caddy/site/links.js
// icon: file name in site/icons/ without .svg (optional), desc: optional
window.HUB = {
  host: "core1",
  ip: "192.168.2.13",
  other: { name: "core2", url: "https://core2.reihungen.de" },
  services: [
    { name: "Home Assistant", url: "https://home.reihungen.de",      icon: "home",      desc: "Smart home" },
    { name: "Paperless",      url: "https://paperless.reihungen.de", icon: "paperless", desc: "Documents" },
    { name: "PhotoPrism",     url: "https://photos.reihungen.de",    icon: "photos",    desc: "Photos" },
    { name: "Pi-hole",        url: "https://pihole.reihungen.de",    icon: "pihole",    desc: "DNS and ad blocking" },
    { name: "Spoolman",       url: "https://spoolman.reihungen.de",  icon: "spoolman",  desc: "Filament spools" },
  ],
};
