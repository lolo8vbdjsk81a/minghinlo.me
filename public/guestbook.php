<?php
declare(strict_types=1);

session_start();

require '/var/www/app/db.php';

$errors = [];
$name = '';
$message = '';

function createCaptcha(): void
{
    $firstNumber = random_int(1, 9);
    $secondNumber = random_int(1, 9);

    $_SESSION['captcha_question'] = "{$firstNumber} + {$secondNumber}";
    $_SESSION['captcha_answer'] = (string) ($firstNumber + $secondNumber);
}

if (
    !isset($_SESSION['captcha_question'], $_SESSION['captcha_answer'])
    || !is_string($_SESSION['captcha_question'])
    || !is_string($_SESSION['captcha_answer'])
) {
    createCaptcha();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim((string) ($_POST['name'] ?? ''));
    $message = trim((string) ($_POST['message'] ?? ''));
    $captchaAnswer = trim((string) ($_POST['captcha_answer'] ?? ''));

    if ($name === '') {
        $name = 'Anonymous';
    } elseif (mb_strlen($name) > 80) {
        $errors[] = 'Name must be 80 characters or fewer.';
    }

    if ($message === '') {
        $errors[] = 'Message is required.';
    } elseif (mb_strlen($message) > 500) {
        $errors[] = 'Message must be 500 characters or fewer.';
    }

    $expectedAnswer = (string) ($_SESSION['captcha_answer'] ?? '');

    if (
        $expectedAnswer === '' ||
        !hash_equals($expectedAnswer, $captchaAnswer)
    ) {
        $errors[] = 'The CAPTCHA answer is incorrect.';
    }

    if ($errors === []) {
        $statement = $pdo->prepare(
            'INSERT INTO guestbook_entries (name, message) 
            VALUES (?, ?)'
        );

        $statement->execute([$name, $message]);

        unset(
            $_SESSION['captcha_question'],
            $_SESSION['captcha_answer']
        );

        header('Location: guestbook.php?posted=1');
        exit;
    }
}

$postsPerPage = 20;

$entries = $pdo->query(
    'SELECT id, name, message, created_at
     FROM guestbook_entries
     ORDER BY created_at DESC'
)->fetchAll();

?>

<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>lolochannel</title>
  <link rel="stylesheet" href="./css/guestbook.css">
</head>
<body>
  <main>
    <header class="guestbook-header">
      <h1>lolochannel</h1>
      <p>
        This guestbook was created to help me learn more about software engineering
        and the LAMP stack, while connecting the database knowledge I learned at
        HKU SPACE with web development.
      </p>
    </header>

    <section class="guestbook-form-section">
      <form method="post" class="guestbook-form">
        <div class="guestbook-name-row">
          <label for="name">Name</label>
          <div>
            <input 
              id="name"
              name="name"
              maxlength="80"
              value="<?= htmlspecialchars($name, ENT_QUOTES, 'UTF-8') ?>"
            >
            <button type="submit">Post</button>
          </div>
        </div>

        <div class="guestbook-message-row">
          <label for="message">Message</label>
          <textarea
            id="message"
            name="message"
            required
            rows="5"
            maxlength="500"
          ><?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?></textarea>
        </div>

        <div class="guestbook-captcha-row">
          <label for="captcha_answer">
            CAPTCHA: What is <?= htmlspecialchars(
              (string) ($_SESSION['captcha_question'] ?? ''),
              ENT_QUOTES,
              'UTF-8'
            ) ?>?
          </label>
          <input
            id="captcha_answer"
            name="captcha_answer"
            inputmode="numeric"
            required
          >
        </div>
      </form>
    </section>

    <section class="guestbook-messages-section">
      <h2>Messages</h2>

      <?php foreach ($entries as $entry): ?>
        <article class="guestbook-entry">
          <header class="entry-meta">
            <strong><?= htmlspecialchars($entry['name']) ?></strong>
            <span><?= htmlspecialchars($entry['created_at']) ?></span>
            <span>No.<?= htmlspecialchars((string) $entry['id']) ?></span>
          </header>

          <p><?= nl2br(htmlspecialchars($entry['message'])) ?></p>
        </article>
      <?php endforeach; ?>
    </section>
  </main>
</body>
</html>

