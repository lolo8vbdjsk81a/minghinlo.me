<?php
declare(strict_types=1);
session_start();

require '/var/www/app/db.php';

if (isset($_SESSION['admin_id'])) {
    header('Location: /admin/admin.php');
    exit;
}

if (!isset($_SESSION['login_csrf'])) {
    $_SESSION['login_csrf'] = bin2hex(random_bytes(32));
}

$errors = [];
$username = '';
$password = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = is_string($_POST['username'] ?? null) ? trim($_POST['username']) : '';
    $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';
    $token = is_string($_POST['csrf_token'] ?? null) ? $_POST['csrf_token'] : '';

    if (!hash_equals($_SESSION['login_csrf'], $token)) {
        $error[] = 'Invalid request. Please try again.';
    }

    if ($username === '' || $password === '') {
        $errors[] = 'Please fill in all fields.';
    }

    if (empty($errors)) {
        $stmt = $pdo->prepare('SELECT id, password_hash FROM admins WHERE username = ?');
        $stmt->execute([$username]);
        $admin = $stmt->fetch();

        if ($admin && password_verify($password, $admin['password_hash'])) {
            // Prevent session fixation attacks
            session_regenerate_id(true);

            $_SESSION['admin_id'] = $admin['id'];
            unset($_SESSION['login_csrf']);

            header('Location: /admin/admin.php');
            exit;
        } else {
            $errors[] = 'Invalid username or password.';
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin login</title>
</head>
<body>
<a href="/guestbook.php">← Back</a>
  <header>
    <h1>Admin login</h1>
  </header>

  <form method="post">
    <input
      type="hidden"
      name="csrf_token"
      value="<?= htmlspecialchars($_SESSION['login_csrf'], ENT_QUOTES, 'UTF-8') ?>"
    >

    <div>
      <label for="username">Username</label>
      <input
        id="username"
        name="username"
        maxlength="80"
        autocomplete="username"
        required
      >
    </div>

    <div>
      <label for="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autocomplete="current-password"
        required
      >
    </div>

    <button type="submit">Log in</button>
  </form>

</body>
</html>
