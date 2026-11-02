#!/usr/bin/bash
~/.npm-global/bin/pm2 delete phonics-kindergarten --silent
~/.npm-global/bin/pm2 serve ~/Public/liam/projects/phonics-kindergarten/build 33000 --name phonics-kindergarten -spa
