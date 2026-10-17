<?php
declare(strict_types=1);

session_start();

if (!isset($_SESSION['admin_id'])) {
    header('Location: /admin/login.php');
    exit;
}

if (!isset($_SESSION['delete_csrf_token'])) {
    $_SESSION['delete_csrf_token'] = bin2hex(random_bytes(32));
}

require '/var/www/app/db.php';

$errors = [];
$name = '';
$message = '';

function createCaptcha(): void {
    $a = random_int(1, 9);
    $b = random_int(1, 9);

    $_SESSION['captcha_question'] = "{$a} + {$b}";
    $_SESSION['captcha_answer'] = (string) ($a + $b);
}

if (!isset($_SESSION['captcha_question'], $_SESSION['captcha_answer'])) {
    createCaptcha();
}

// action=post    -> validate CAPTCHA and create an entry
// action=delete  -> record an admin deletion

if (
    $_SERVER['REQUEST_METHOD'] === 'POST' &&
    ($_POST['action'] ?? '') === 'delete'
) {
    $token = is_string($_POST['delete_csrf_token'] ?? null) ? $_POST['delete_csrf_token'] : '';

    if (!hash_equals($_SESSION['delete_csrf_token'], $token)) {
        http_response_code(403);
        exit('403 Invalid deletion request. Reload the page and try again.');
    }

    $entryId = filter_var(
        $_POST['entry_id'] ?? null,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );

    if ($entryId === false || $entryId === null) {
        http_response_code(400);
        exit('Invalid entry ID.');
    }

    $statement = $pdo->prepare(
        'INSERT INTO guestbook_deletions (admin_id, entry_id)
         SELECT ?, e.id
         FROM guestbook_entries AS e
         WHERE e.id = ?
           AND NOT EXISTS (
               SELECT 1
               FROM guestbook_deletions AS d
               WHERE d.entry_id = e.id
           )'
    );

    $statement->execute([$_SESSION['admin_id'], $entryId,]);

    header('Location: /admin/admin.php?deleted=1', true, 303);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST'
    &&
    ($_POST['action'] ?? '') === 'post'
) {
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

        header('Location: /admin/admin.php?posted=1', true, 303);
        exit;
    }
}



$postsPerPage = 20;

// Filter out deleted entries
$entries = $pdo->query(
    'SELECT e.id, e.name, e.message, e.created_at
     FROM guestbook_entries AS e
     WHERE NOT EXISTS (
         SELECT 1
         FROM guestbook_deletions AS d
         WHERE d.entry_id = e.id
     )
     ORDER BY e.created_at DESC, e.id DESC'
)->fetchAll(); // array

?>

<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>lolochannel</title>
  <link rel="icon" type="image/x-icon" href="../assets/images/favicon.ico">
  <link rel="stylesheet" href="../css/guestbook.css">
  <link rel="stylesheet" href="../css/shared.css">
</head>
<body>
  <main>
    <a class="back-btn" href="/">← Home</a>
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
        <input type="hidden" name="action" value="post">

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

            <!-- Admin: delete entry button -->
            <form method="post" action="/admin/admin.php">
              <input type="hidden" name="action" value="delete">

              <input
                type="hidden"
                name="entry_id"
                value="<?= htmlspecialchars((string) $entry['id']) ?>"
              >

              <input
                type="hidden"
                name="delete_csrf_token"
                value="<?= htmlspecialchars($_SESSION['delete_csrf_token']) ?>"
              >

              <button type="submit">Delete</button>
            </form>

          </header>
          <p><?= nl2br(htmlspecialchars($entry['message'])) ?></p>
        </article>
      <?php endforeach; ?>
    </section>

    <b class="admin-login-btn">
      Admin logged in
    </b>

  </main>
  <footer>
    <div class="cnt footerCnt">
  	  <img src="../assets/images/footer-lolo.png" alt="footer-lolo" loading="lazy">
      <p>&copy; 2024-<?= date('Y') ?> Lolo. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>


