import { openLocalAndroid } from "./lib/android-local.mjs";
const android = openLocalAndroid();
android.run(["reverse", "tcp:8081", "tcp:8081"]);
android.run(["reverse", "tcp:3001", "tcp:3001"]);
android.run([
  "shell",
  "am",
  "start",
  "-W",
  "-a",
  "android.intent.action.VIEW",
  "-d",
  "exp://127.0.0.1:8081/--/",
  "-p",
  "host.exp.exponent",
]);
console.log(
  "Opened project in Expo Go via local ADB reverse. Metro must already be running on port 8081.",
);
