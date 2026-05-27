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