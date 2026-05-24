import "./_css/Greeting.css";

type GreetingProps = {
  message?: string;
};

export default function Greeting({
  message = "Bienvenue sur Evollis",
}: GreetingProps) {
  return (
    <div
      className="greeting"
      style={{ fontSize: "clamp(1.875rem, 1.2rem + 2vw, 2.5rem)", lineHeight: 1.5 }}
    >
      <div className="greeting-mark" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/evollis-logo.svg" alt="" className="greeting-mark-img" />
      </div>
      <span className="greeting-text">{message}</span>
    </div>
  );
}
