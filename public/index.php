<?php
declare(strict_types=1);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Lolo's playground</title>
  <link rel="icon" type="image/x-icon" href="assets/images/favicon.ico">
  <link rel="stylesheet" href="css/index.css">
  <link rel="stylesheet" href="./css/shared.css">
  <script src="assets/js/pageload.js" defer></script>
</head>
<body>
  <div class="page-loader">
    <div class="spinner"></div>
  </div>

  <header>
    <div class="cnt logo-area">
      <a class="logo" href="/">
	    <img src="assets/images/logo.png" alt="Logo">
        <span>MINGHINLO.ME</span>
      </a>
      <div class="external-links">
        <a href="https://github.com/lolo8vbdjsk81a/" target="_blank">GitHub</a>
        <a href="https://www.linkedin.com/in/leo-ming-hin-lo" target="_blank">LinkedIn</a>
        <a href="https://leetcode.com/u/lolo673452/" target="_blank">LeetCode</a>
        <a href="https://www.pixiv.net/en/users/22227622" target="_blank">Pixiv</a>
      </div>
    </div>
    <!-- <img src="assets/images/header.jpg" alt="Header"> -->
  </header>
  <nav class="nav">
    <a href="#">HOME</a>
    <a href="#about">ABOUT</a>
    <a href="#projects">PROJECTS</a>
    <a href="#contact">CONTACT</a>
  </nav>

  <hr>

  <main>
    <section id="about" class="section about">
      <div class="cnt">
        <h2>About</h2>
        <div class="aboutContent">
          <div class="avatar"><img src="assets/images/avatar.png" alt="Avatar"></div>
          <div class="aboutText">
            <p>
              HKUST BEng Computer Science year 2 student. Former HKU SPACE associate degree student. Interest includes but not limited to computer stuffs, mathematics, and digital art. Also self-learning Japanese right now, preparing for next N2 exam.
            </p>
            <p>
              Currently doing a one year internship at Hospital Authority, doing infrastructure related works.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section id="projects" class="section projects">
      <div class="cnt">
        <h2>Projects</h2>
        <div class="project-button"><a href="./HTML5Grid.html">nonamegrapher (VisualAlgebra)</a></div>
      </div>
    </section>

    <section id="playground" class="section playground">
      <div class="cnt">
        <h2>Playground</h2>
        <div class="playground-button"><a href="./guestbook.php">Guestbook</a></div>
      </div>
    </section>

    <section id="contact" class="section contact">
      <div class="cnt">
        <h2>Contact</h2>
        <p><b>Email:</b>
          <br>
          &emsp;&#9670; <a href="mailto:minghinlo21@gmail.com">minghinlo21@gmail.com</a>
          <br>
          &emsp;&#9670; <a href="mailto:mhloag@connect.ust.hk">mhloag@connect.ust.hk</a>
          <br>
          &emsp;&#9670; <a href="mailto:leo@minghinlo.me">leo@minghinlo.me</a>
        </p>
      </div>
    </section>
  </main>

  <footer>
    <div class="cnt footerCnt">
  	  <img src="assets/images/footer-lolo.png" alt="footer-lolo" loading="lazy">
      <p>&copy; 2024-<?= date('Y') ?> Lolo. All rights reserved.</p>
  	  <!--<p><a href="pages/visualalgebra-privacy-policy.html">VisualAlgebra Privacy Policy</a></p>-->
    </div>
  </footer>

</body>
</html>
