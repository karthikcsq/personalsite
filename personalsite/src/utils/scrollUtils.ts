export const scrollToCenter = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>, id: string) => {
    event.preventDefault();
    const target = document.querySelector(id);
    console.log(target);
    if (target) {
      const targetPosition = target.getBoundingClientRect().top + window.scrollY;
      const offset = window.innerHeight / 2 - target.clientHeight / 2; // Center the div
      console.log(targetPosition - offset);
      window.scrollTo({
        top: targetPosition - offset,
        behavior: "smooth",
      });
    }
  };