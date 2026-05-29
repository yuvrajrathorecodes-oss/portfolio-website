const hiddenElements = document.querySelectorAll(".hidden");

window.addEventListener("scroll", () => {
  hiddenElements.forEach((el) => {
    const rect = el.getBoundingClientRect();

    if (rect.top < window.innerHeight - 100) {
      el.classList.add("show");
    }
  });
});

 var typed = new Typed('#element', {
      strings: ['<i>Web Developer</i>', '<i>Python Developer</i>', '<i>IoT Enthusiast</i>', '<i>UI Designer</i>','<i>Content Creator</i>'],
      typeSpeed: 100,
      backSpeed:100,
      backDelay:1000,
      loop:true
    });


const title = document.querySelector(".main-text h2");

document.addEventListener("mousemove", (e) => {
  let x = (window.innerWidth / 2 - e.clientX) / 25;
  let y = (window.innerHeight / 2 - e.clientY) / 25;

  title.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
});



const contactSection = document.querySelector(".contact");

window.addEventListener("scroll", () => {
  let position = contactSection.getBoundingClientRect().top;
  let screenPosition = window.innerHeight / 1.3;

  if (position < screenPosition) {
    contactSection.style.opacity = "1";
    contactSection.style.transform = "translateY(0)";
  }
});






const contact = document.querySelector(".contact");

window.addEventListener("scroll", () => {
  const top = contact.getBoundingClientRect().top;
  const windowHeight = window.innerHeight;

  if (top < windowHeight - 100) {
    contact.classList.add("show");
  }
});