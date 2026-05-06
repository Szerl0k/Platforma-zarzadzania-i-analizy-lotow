#!/bin/sh

# Start SSH daemon
/usr/sbin/sshd

# Start node app
exec "$@"