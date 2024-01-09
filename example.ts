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
    async ({ newRefreshToken, oldRefreshToken }) => {
      console.log('Token refreshed!');
      if (!oldRefreshToken) { return; }   // TODO: Get another auth token!
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

  if (allCameras.length) {
    allCameras.forEach((camera) => {
      console.log(`${camera.name} has battery level ${camera.batteryLevel}.`);
    })
  }
  
  function takeTime(timeval: number): string {
    // gets the time string and constructs a string like 'YYYYMMDD_HHmmss'
    const t = new Date(timeval),
      d2 = '2-digit',
      DT_Opts: Intl.DateTimeFormatOptions = { 
        year: "numeric", month: d2, day: d2,
        hour: d2, minute: d2, second: d2      
    }
    const timeFormatter = Intl.DateTimeFormat('en-US', DT_Opts);
    const timeFields: Intl.DateTimeFormatPart[] = timeFormatter.formatToParts(t);
    const { year, month, day, hour, minute, second } = timeFields.reduce(
      (obj, {type, value}) => {
        if (type != 'literal') {
          Object.defineProperty(obj, type, { value: value });
        }
        return obj;
      },{}
    ) as any;  // shut up, ts!
    return `${year+month+day}_${hour+minute+second}`;  //  concatenation, NOT addition!
  }
  
  // let's try to get a snapshot...
  const fluffyCam = allCameras.find( cam => cam.name == '@Fluffy');
  if ( fluffyCam ) {
    fluffyCam.requestUpdate();
    const snap = await fluffyCam.getSnapshot(),
      snapAge = fluffyCam.currentTimestampAge;
    console.log(`\nSnap taken ${snapAge / 1000} seconds ago.\n`,fluffyCam.data);
    await promisify(writeFile)(`${takeTime(Date.now() - 1000 * snapAge)}snap.jpg`, snap);
  }

  await sub.unsubscribe();
  process.exit(0);
}

example();

