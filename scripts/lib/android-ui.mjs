import assert from "node:assert/strict";
export function openAndroidUi(android) {
  const pause = () => new Promise((resolve) => setTimeout(resolve, 900));
  async function waitFor(text) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const xml = android.hierarchy();
      if (xml.includes(text)) return xml;
      await pause();
    }
    throw new Error("Expected native screen text missing: " + text);
  }
  function nodeFor(xml, label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Controls have explicit accessibility labels. A matching heading is not a tap target.
    return xml.match(
      new RegExp('<node[^>]*content-desc="' + escaped + '"[^>]*>'),
    )?.[0];
  }
  function tapNode(node) {
    const bounds = node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    assert.ok(bounds, "Native control must be visible");
    android.run([
      "shell",
      "input",
      "tap",
      String(Math.round((Number(bounds[1]) + Number(bounds[3])) / 2)),
      String(Math.round((Number(bounds[2]) + Number(bounds[4])) / 2)),
    ]);
  }
  async function tap(label) {
    let node;
    for (let attempt = 0; attempt < 6; attempt++) {
      node = nodeFor(android.hierarchy(), label);
      const bounds = node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
      if (
        bounds &&
        Number(bounds[3]) > Number(bounds[1]) &&
        Number(bounds[4]) > Number(bounds[2])
      )
        break;
      node = undefined;
      const size = android.run(["shell", "wm", "size"]).match(/(\d+)x(\d+)/);
      assert.ok(size);
      android.run([
        "shell",
        "input",
        "swipe",
        String(Math.round(Number(size[1]) / 2)),
        String(Math.round(Number(size[2]) * 0.8)),
        String(Math.round(Number(size[1]) / 2)),
        String(Math.round(Number(size[2]) * 0.35)),
        "300",
      ]);
      await pause();
    }
    tapNode(node);
    await pause();
  }
  async function enter(label, value) {
    assert.ok(
      /^[a-zA-Z0-9._@-]+$/.test(value),
      "Automation requires shell-safe local account input; use manual verification for other characters",
    );
    await tap(label);
    android.run(["shell", "input", "keyevent", "123"]);
    android.run(["shell", "input", "keyevent", ...Array(128).fill("67")]);
    try {
      android.run(["shell", "input", "text", value]);
    } catch {
      throw new Error("Could not enter account input");
    }
  }
  async function launch(route, apiPort = 3001) {
    android.run(["reverse", "tcp:8081", "tcp:8081"]);
    android.run(["reverse", "tcp:3001", "tcp:" + apiPort]);
    android.run(["shell", "am", "force-stop", "host.exp.exponent"]);
    // MuMu finishes removing the previous task asynchronously after force-stop.
    await pause();
    android.run([
      "shell",
      "am",
      "start",
      "-W",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      "exp://127.0.0.1:8081/--/" + route,
      "-p",
      "host.exp.exponent",
    ]);
  }

  async function openLogin(apiPort = 3001) {
    await launch("devices", apiPort);
    let xml = "";
    for (let i = 0; i < 12; i++) {
      xml = android.hierarchy();
      if (
        xml.includes("登录设备服务") ||
        xml.includes('content-desc="退出登录"')
      )
        break;
      await pause();
    }
    if (xml.includes('content-desc="退出登录"')) await tap("退出登录");
    await waitFor("登录设备服务");
  }
  async function login(username, password, expectedCode) {
    await enter("账号", username);
    await enter("密码", password);
    android.run(["shell", "input", "keyevent", "4"]);
    await tap("登录");
    await waitFor(expectedCode);
  }
  return {
    waitFor,
    tap,
    enter,
    launch,
    pause,
    nodeFor,
    tapNode,
    openLogin,
    login,
  };
}
