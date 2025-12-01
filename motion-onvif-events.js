#!/usr/bin/env node

const fs = require('fs');
const { ArgumentParser } = require('argparse');
const pjson = require('./package.json');
const Motion = require('./lib/motion');
const Camera = require('./lib/camera');

async function start(args) {
  let camerasConfig;

  try {
    const configContent = fs.readFileSync(args.config_file, 'utf-8');
    config = JSON.parse(configContent);
    camerasConfig = config.cameras || [];
  } catch (err) {
    console.error(`[ERROR] Unable to read or parse config file at ${args.config_file}:`, err.message);
    process.exit(1);
  }

  const cameraPromises = camerasConfig.map(async (camConfig) => {
    const motion = new Motion({
      base: args.motion_base_url,
      camId: camConfig.motionCameraId,
    });

    const camera = await Camera.create(
      {
        hostname: camConfig.hostname,
        username: camConfig.username,
        password: camConfig.password,
        port: camConfig.port,
        timeout: camConfig.timeout || args.timeout,
      },
      motion
    );

    camera.addEventListener();
    return camera;
  });

  await Promise.all(cameraPromises);

  console.log('Motion ONVIF Events Bridge started successfully.');
}


function main() {
  const parser = new ArgumentParser({
    addHelp: true,
    description: 'ONVIF motion detection events bridge to Motion supporting multiple cameras',
    version: pjson.version,
  });

  parser.addArgument(['-m', '--motion-base-url'], {
    help: 'Base URL for the Motion instance (with trailing slash)',
    required: true,
  });
  parser.addArgument(['-f', '--config-file'], {
    help: 'Path to a JSON config file containing cameras array(default: /etc/moe.json)',
    defaultValue: '/etc/moe.json',
  });
  parser.addArgument(['-t', '--timeout'], {
    help: 'Default timeout (in ms) between no motion in the Camera and trigger the end of event to Motion',
    defaultValue: 10000,
  });

  const args = parser.parseArgs();
  start(args);
}

main();
