FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y openssh-server mysql-server && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN mkdir /var/run/sshd

RUN sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin without-password/' /etc/ssh/sshd_config

RUN mkdir -p /root/.ssh && chmod 700 /root/.ssh

COPY mykey.pub /root/.ssh/authorized_keys

RUN chmod 600 /root/.ssh/authorized_keys

RUN service mysql start && \
    mysql -uroot -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root'; FLUSH PRIVILEGES;" && \
    service mysql stop

EXPOSE 22

COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]