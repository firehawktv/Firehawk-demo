# Firehawk CMS — Deployment Guide

Deploys to an existing Ubuntu server with **nginx** already running, using **PM2** as the process manager and **MongoDB** running on the same server. App lives at `/home/firehawk/htdocs/firehawk.tv`.

---

## Prerequisites

Have these ready before you start:

| Item | Notes |
|------|-------|
| Ubuntu server with nginx running | SSH access |
| Domain name | Pointed to your server's IP via an A record |
| MongoDB | Installed on the server (covered in Step 1) |
| Mux API credentials | From [dashboard.mux.com/settings/access-tokens](https://dashboard.mux.com/settings/access-tokens) |
| Git access to this repo | SSH key or HTTPS credentials |

> **Security note:** The `/admin` routes have no authentication. Before going live, either restrict access by IP in nginx or add an auth layer. Do not expose a public URL without doing this first.

---

## 1. Install MongoDB on the Server

Install the official MongoDB 7.0 package (Ubuntu 22.04):

```bash
# Import the MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add the MongoDB repo
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB and enable it on boot
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify it's running
sudo systemctl status mongod
```

The connection string for this app is simply:
```
MONGODB_URI=mongodb://localhost:27017/firehawk
```

MongoDB creates the `firehawk` database automatically the first time the app writes to it — no setup needed.

> **Optional — MongoDB Atlas instead:** If you'd prefer a managed cloud database, create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas), get the `mongodb+srv://...` connection string from the Atlas dashboard, and use that as `MONGODB_URI` instead. The rest of the steps are identical.

---

## 2. Firewall

If ufw isn't already configured:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

Verify with `sudo ufw status`. Port 3000 (Node) should **not** be open — nginx handles public traffic.

---

## 3. Install Node.js via nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

nvm install 20
nvm use 20
nvm alias default 20

node --version   # should print v20.x.x
```

---

## 4. Install PM2

```bash
npm install -g pm2
```

---

## 5. Clone the Repository

```bash
cd /home/firehawk/htdocs
git clone https://github.com/firehawktv/Firehawk-demo.git firehawk.tv
cd firehawk.tv
```

---

## 6. Install Dependencies & Build CSS

```bash
# Install production dependencies only
npm install --omit=dev

# Build the Tailwind CSS (always run this on first deploy and after any CSS changes)
npm run build
```

---

## 7. Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

Fill in all values:

```env
PORT=3000
NODE_ENV=production

# MongoDB running on this server (from Step 1)
MONGODB_URI=mongodb://localhost:27017/firehawk

# Mux API credentials
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
```

Protect the file:
```bash
chmod 600 .env
```

---

## 8. Ensure Uploads Directory is Writable

```bash
mkdir -p public/uploads/logos
chmod 755 public/uploads/logos
```

This directory is where client logos are stored when uploaded via the admin dashboard. It is not tracked by git (only a `.gitkeep` is committed), so you must create it manually on first deploy.

---

## 9. Start the App with PM2

```bash
pm2 start server.js --name firehawk
pm2 save

# Generate and install startup script so PM2 restarts after reboots
pm2 startup
# Copy and run the command it prints (it will look like: sudo env PATH=... pm2 startup ...)
```

Verify it's running:
```bash
pm2 status
pm2 logs firehawk
```

You should see `MongoDB Connected` and `Server running on http://localhost:3000` in the logs.

---

## 10. Configure nginx

Create a new site config:

```bash
sudo nano /etc/nginx/sites-available/firehawk.tv
```

Paste the following, replacing `firehawk.tv` with your actual domain if different:

```nginx
server {
    listen 80;
    server_name firehawk.tv www.firehawk.tv;

    # Increase upload limit for logo files
    client_max_body_size 5M;

    # Serve static files directly (faster than going through Node)
    location /css/ {
        root /home/firehawk/htdocs/firehawk.tv/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /uploads/ {
        root /home/firehawk/htdocs/firehawk.tv/public;
        expires 7d;
    }

    # Proxy everything else to Node
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it and reload nginx:

```bash
sudo ln -s /etc/nginx/sites-available/firehawk.tv /etc/nginx/sites-enabled/
sudo nginx -t          # test config — must say "syntax is ok"
sudo systemctl reload nginx
```

> **Note:** If nginx already has a config for this domain (e.g. a static site placeholder), remove or replace it rather than creating a second one. Check with `ls /etc/nginx/sites-enabled/`.

At this point `http://firehawk.tv/admin` should load over plain HTTP.

---

## 11. SSL with Let's Encrypt

If SSL isn't already set up for this domain:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d firehawk.tv -d www.firehawk.tv
```

Certbot will:
- Obtain a certificate from Let's Encrypt
- Automatically update your nginx config to redirect HTTP → HTTPS
- Set up a cron job to auto-renew the cert every 90 days

Verify auto-renewal works:
```bash
sudo certbot renew --dry-run
```

---

## 12. Verify the Deployment

1. Visit `https://firehawk.tv/admin` — admin dashboard should load
2. Go to **Presentations → Create** and upload a client logo — it should save and display
3. Create a test presentation and visit `https://firehawk.tv/hello/<slug>` — the public view should render
4. Click **Sync from Mux** — should pull assets from your Mux account (requires valid Mux credentials)

Check logs at any time:
```bash
pm2 logs firehawk
```

---

## 13. Deploying Updates

Each time you push changes to the repo, deploy them to the server like this:

```bash
cd /home/firehawk/htdocs/firehawk.tv
git pull origin main
npm install --omit=dev     # only needed if package.json changed
npm run build              # only needed if CSS/Tailwind changed
pm2 reload firehawk        # zero-downtime reload
```

You can wrap this in a shell script for convenience:

```bash
# /home/firehawk/deploy.sh
#!/bin/bash
set -e
cd /home/firehawk/htdocs/firehawk.tv
git pull origin main
npm install --omit=dev
npm run build
pm2 reload firehawk
echo "Deploy complete."
```

```bash
chmod +x /home/firehawk/deploy.sh
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Port Node.js listens on. Default: `3000`. nginx proxies to this. |
| `NODE_ENV` | Yes | Set to `production`. Hides stack traces in error pages. |
| `MONGODB_URI` | Yes | MongoDB connection string. Default for local install: `mongodb://localhost:27017/firehawk` |
| `MUX_TOKEN_ID` | No* | Mux API token ID. Required for Sync from Mux feature. |
| `MUX_TOKEN_SECRET` | No* | Mux API token secret. Required for Sync from Mux feature. |

*The app starts and runs without Mux credentials — the sync button will show an error if they're missing.

---

## CloudPanel: Adding a Subdomain

If you're running CloudPanel and want the CMS accessible at a subdomain (e.g. `cms.firehawk.tv`):

### 1. Add the subdomain in CloudPanel

1. Log in to CloudPanel and go to **Sites**
2. Click **+ Add Site** → choose **Reverse Proxy**
3. Fill in:
   - **Domain Name:** `cms.firehawk.tv`
   - **Reverse Proxy URL:** `http://127.0.0.1:3000`
4. Save — CloudPanel will generate an nginx vhost for it

### 2. Issue an SSL certificate

In CloudPanel, go to the site's **SSL/TLS** tab and click **Actions → New Let's Encrypt Certificate**. CloudPanel handles the cert and auto-renewal automatically.

### 3. Adjust the nginx vhost (upload limit + static files)

CloudPanel stores vhost configs at `/etc/nginx/sites-enabled/<domain>.conf`. Find the one it generated for `cms.firehawk.tv` and edit it:

```bash
sudo nano /etc/nginx/sites-enabled/cms.firehawk.tv.conf
```

Inside the `server` block, add the upload limit and static file locations **before** the existing `location /` block:

```nginx
# Increase upload limit for logo files
client_max_body_size 5M;

# Serve static files directly
location /css/ {
    root /home/firehawk/htdocs/firehawk.tv/public;
    expires 30d;
    add_header Cache-Control "public, immutable";
}

location /uploads/ {
    root /home/firehawk/htdocs/firehawk.tv/public;
    expires 7d;
}
```

The existing `location /` reverse proxy block that CloudPanel generated can stay as-is.

Test and reload:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

The CMS will now be accessible at `https://cms.firehawk.tv/admin`.

---
## Migrating local database

Standard MongoDB dump/restore — run this locally, copy the dump to the server,
   restore it there.

  1. Dump your local database:
  ```mongodump --db firehawk --out ~/firehawk-dump```

  2. Copy the dump to your server:
  ```scp -r ~/firehawk-dump firehawk@firehawk.tv:/home/firehawk/firehawk-dump```

  3. SSH into the server and restore it:
  ```ssh firehawk@firehawk.tv  mongorestore --db firehawk /home/firehawk/firehawk-dump/firehawk```

  4. Clean up the dump file:
 ``` rm -rf /home/firehawk/firehawk-dump```

  That's it. The restore won't touch anything already in the database — it
  merges — so it's safe to run even if the app has already written a few
  documents server-side.

  One thing to check: if you have uploaded logos in public/uploads/logos/
  locally that are referenced by presentations, those image files won't come
  across with the DB dump. You'd need to copy them separately:

  scp -r /Users/cooney/Sites/firehawk-demo/public/uploads/logos/ \
    firehawk@firehawk.tv:/home/firehawk/htdocs/firehawk.tv/public/uploads/
___

## Troubleshooting

**`pm2 logs` shows `MongoNetworkTimeoutError` or `ECONNREFUSED 127.0.0.1:27017`**
MongoDB isn't running. Check with `sudo systemctl status mongod` and start it with `sudo systemctl start mongod`. If it fails to start, check logs with `sudo journalctl -u mongod --no-pager | tail -30`.

**nginx returns 413 Request Entity Too Large on logo upload**
Increase `client_max_body_size` in the nginx config (currently set to 5M, which exceeds the 2MB multer limit).

**Port 3000 already in use on restart**
Check `pm2 status`. If the app shows `errored`, run `pm2 delete firehawk` then `pm2 start server.js --name firehawk && pm2 save`.

**CSS changes not showing after deploy**
Run `npm run build` then `pm2 reload firehawk`. Also clear your browser cache or do a hard refresh.

**Uploaded logos disappear after a `git pull`**
This is expected — `public/uploads/logos/` is not tracked by git. The directory persists on disk through deploys as long as you don't delete it or re-clone. If you re-clone, recreate the directory: `mkdir -p public/uploads/logos`.

**nginx site conflict — two configs for the same domain**
Check `ls /etc/nginx/sites-enabled/` for duplicate entries. Disable the old one with `sudo rm /etc/nginx/sites-enabled/<old-config>` then reload nginx.

**`nginx -t` fails with "unknown directive"**
Check you pasted the full config block correctly. The most common mistake is a missing closing `}`.
