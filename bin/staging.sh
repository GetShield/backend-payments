npm i
npm run build

# Install pm2 if not found
{
  pm2 stop EZE-PAYMENTS
} || {
  npm i -g pm2
}

npm run start:staging
