# [minghinlo.me](https://minghinlo.me)

This is my personal portfolio website. I may occasionally update it and add more fun stuff. All artwork used on the website is my own.

It is built with a LAMP-style stack running in Docker:
- Apache
- PHP
- MariaDB
- Docker Compose

## Requirements
- Docker
- Docker Compose

## Local development
Create a local `.env` file in the root of the repository:
```env
LETSENCRYPT_EMAIL=email@example.com
MARIADB_DATABASE=homepage
MARIADB_USER=homepage_user
MARIADB_PASSWORD=change-this-password
MARIADB_ROOT_PASSWORD=change-this-root-password
```

Start the local stack:
```bash
docker compose -f docker-compose.local.yml up -d --build
```

Open the website:
```
http://localhost:8080
```

## License
- **Code Base:** Licensed under the [MIT License](LICENSE).
- **Art & Media Assets:** All files located in the `images/` directory are **All Rights Reserved** and Copyright (c) 2026 Lolo. You may not reuse or redistribute these assets without permission.
