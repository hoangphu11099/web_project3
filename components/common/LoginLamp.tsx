"use client";

import { FiPower } from "react-icons/fi";
import { Icon } from "@/components/ui/Icon";

export function LoginLamp({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return <div className="study-scene">
    <div className="study-light" aria-hidden="true" />
    <button className="study-lamp" type="button" onClick={onToggle} aria-pressed={on}
      aria-label={on ? "Tắt đèn góc học tập" : "Bật đèn góc học tập"}>
      <span className="lamp-cord" aria-hidden="true" />
      <span className="lamp-shade" aria-hidden="true"><span className="lamp-bulb" /></span>
      <span className="lamp-pull" aria-hidden="true"><span /></span>
    </button>
    <button className="lamp-switch" type="button" onClick={onToggle} aria-pressed={on}>
      <FiPower size={18} aria-hidden="true" />{on ? "Đèn đang bật" : "Bật sáng góc học tập"}
    </button>
    <p className="lamp-hint">{on ? "Một chút ánh sáng. Một khởi đầu mới." : "Chạm vào chiếc đèn để bật sáng."}</p>
    <div className="study-desk" aria-hidden="true">
      <div className="study-book"><Icon name="course" size={56} /></div>
      <div className="study-books"><i /><i /><i /></div>
      <div className="study-cup"><span /></div>
      <div className="study-table" />
    </div>
  </div>;
}
