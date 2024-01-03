import "dotenv/config";
import { RingApi } from "ring-client-api";
import { readFile, writeFile } from "fs";
import { promisify } from "util";

async function getRing() {
  const { env } = process,
        ringApi = new RingApi({
          refreshToken: env.RING_REFRESH_TOKEN!,
          debug: true
        });

  const sub = ringApi.onRefreshTokenUpdated.subscribe(
    async ({newRefreshToken, oldRefreshToken}) => {
      console.log('Token refreshed!');

      if (!oldRefreshToken) { return; }

      const currentConfig = await promisify(readFile)('.env'),
            updatedConfig = currentConfig
              .toString()
              .replace(oldRefreshToken, newRefreshToken);
      
      await promisify(writeFile)('.env', updatedConfig)
    }
  )
  

  return { ringApi, sub };

}

async function example() {
  const { ringApi, sub } = await getRing(),
               locations = await ringApi.getLocations(),
              allCameras = await ringApi.getCameras();

  console.log(
    `Found ${locations.length} location(s) with ${allCameras.length} camera(s).`
  );

  // ringApi.onRefreshTokenUpdated.subscribe(
  //   async ({ newRefreshToken, oldRefreshToken }) => {
  //     console.log("Refresh Token Updated: ", newRefreshToken);

  //     // If you are implementing a project that use `ring-client-api`, you should subscribe to onRefreshTokenUpdated and update your config each time it fires an event
  //     // Here is an example using a .env file for configuration
  //     if (!oldRefreshToken) {
  //       return;
  //     }

  //     const currentConfig = await promisify(readFile)(".env"),
  //       updatedConfig = currentConfig
  //         .toString()
  //         .replace(oldRefreshToken, newRefreshToken);

  //     await promisify(writeFile)(".env", updatedConfig);
  //   }
  // );

  for (const location of locations) {
    let haveConnected = false;
    location.onConnected.subscribe((connected) => {
      if (!haveConnected && !connected) {
        return;
      } else if (connected) {
        haveConnected = true;
      }

      const status = connected ? "Connected to" : "Disconnected from";
      console.log(`**** ${status} location ${location.name} - ${location.id}`);
    });
  }

  // for (const location of locations) {
  //   const cameras = location.cameras,
  //     devices = await location.getDevices();

  //   console.log(
  //     `\nLocation ${location.name} (${location.id}) has the following ${cameras.length} camera(s):`
  //   );

  //   console.log(
  //     `\nLocation ${location.name} (${location.id}) has the following ${devices.length} device(s):`
  //   );

  //   for (const device of devices) {
  //     console.log(`- ${device.zid}: ${device.name} (${device.deviceType})`);
  //   }
  // }

  if (allCameras.length) {
    allCameras.forEach((camera) => {
      console.log(`${camera.name} has battery level ${camera.batteryLevel}.`);
    })
  }
  
  await sub.unsubscribe();
  process.exit(0);
}

example();

