FROM dexidp/dex:v2.35.3

COPY dex-config.yaml /etc/dex/cfg/config.yaml

EXPOSE 5556

CMD ["dex", "serve", "/etc/dex/cfg/config.yaml"]
