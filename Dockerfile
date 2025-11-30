FROM node:12.9-alpine
ENV CONFIG_FILE="/etc/moe.json"
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh
COPY . /tmp/motion-onvif-events
RUN npm install -g /tmp/motion-onvif-events
CMD motion-onvif-events --motion-base-url $MOTION_BASE_URL --config-file=$CONFIG_FILE
