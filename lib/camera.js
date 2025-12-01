const { Cam } = require('onvif');

module.exports = class Camera {
  constructor(onvifCam, motion, delay) {
    this.onvifCam = onvifCam;
    this.motion = motion;
    this.timeout = {
      id: null,
      delay,
    };
    this.prevMotionValue = false;
  }

  static async create({ hostname, username, password, port, timeout }, motion) {
    const onvifCam = await this.createOnvifCam(
      { hostname, username, password, port },
      timeout
    );

    return new Camera(onvifCam, motion, timeout);
  }

  static createOnvifCam(conf, delay = 5000) {
    return new Promise((resolve) => {
      const tryConnect = () => {
        const cam = new Cam(conf, (err) => {
          if (err) {
            console.log(
              `Error connecting to ONVIF Camera ${conf.hostname}: ${err}. Retrying in ${delay} ms...`
            );
            setTimeout(tryConnect, delay);
            return;
          }
          resolve(cam);
        });
      };

      tryConnect();
    });
  }

  addEventListener() {
    this.onvifCam.on('event', (camMessage) => this.onEvent(camMessage));
    this.log('Start event listener');
  }

  onEvent(camMessage) {
    const topic = camMessage.topic._;
    if (topic.indexOf('RuleEngine/CellMotionDetector/Motion') !== -1) {
      this.onMotionDetected(camMessage);
    }
  }

  onMotionDetected(camMessage) {
    const isMotion = camMessage.message.message.data.simpleItem.$.Value;

    if (this.prevMotionValue === isMotion) {
      return;
    }

    this.log(`Motion detected: ${isMotion}`);

    if (isMotion && !this.timeout.id) {
      this.motion.eventStart();
    }

    if (isMotion && this.timeout.id) {
      clearTimeout(this.timeout.id);
      this.timeout.id = null;
    }

    if (!isMotion) {
      this.timeout.id = setTimeout(() => {
        this.motion.eventEnd();
        this.timeout.id = null;
      }, this.timeout.delay);
    }

    this.prevMotionValue = isMotion;
  }

  log(msg) {
    const date = new Date().toLocaleString();
    console.log(`[${date}][${this.motion.camId}] Camera: ${msg}`);
  }
};
