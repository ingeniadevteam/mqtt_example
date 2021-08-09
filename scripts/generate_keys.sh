#!/bin/bash
openssl req -x509 -newkey rsa:2048 -keyout rsa_private.pem -nodes -out \
    ../resources/rsa_cert.pem -subj "/CN=unused"
openssl ecparam -genkey -name prime256v1 -noout -out ../resources/ec_private.pem
# openssl ec -in ec_private.pem -pubout -out ec_public.pem