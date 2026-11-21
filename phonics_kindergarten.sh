#!/usr/bin/bash
$HOME/.npm-global/bin/pm2 delete phonics-kindergarten --silent
$HOME/.npm-global/bin/pm2 serve $HOME/Public/liam/projects/phonics-kindergarten/build 33000 --name phonics-kindergarten -spa
