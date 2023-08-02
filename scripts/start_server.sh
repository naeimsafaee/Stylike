
#!/bin/bash

# add permision to folder
sudo chmod -R 777 /var/www/stylike-api

# Go to app folder
cd /var/www/stylike-api

# start again
echo "start all services"
pm2 start all