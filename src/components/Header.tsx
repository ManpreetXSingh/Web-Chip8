import iconUrl from "../icons/C8_Icon_192.png";
import "../styles/header.css";

export default function Header() {
  return (
    <div class="header">
      <img src={iconUrl} alt="C8" />
      <h1>Chip 8 Emulator</h1>
    </div>
  );
}
