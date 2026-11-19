import Phaser from "phaser";
import { checkReadiness } from "../api/readiness";
import { Preview } from "../game/scenes/preview";
import { showAssetError, showConnection, showRoster } from "../ui/preview";
import "../ui/style.css";

showConnection(checkReadiness);
try {
  new Phaser.Game({
    type: Phaser.CANVAS,
    parent: "stage",
    backgroundColor: "#e6deca",
    audio: { noAudio: true },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 480,
      height: 240,
    },
    scene: new Preview({ ready: showRoster, failed: showAssetError }),
    banner: false,
  });
} catch {
  showAssetError();
}
