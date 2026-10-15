<?php
declare(strict_types=1);
session_start();

require '/var/www/app/db.php';

if (isset($_SESSION['admin_id'])) {
    header('Location: /admin/admin.php');
    exit;
}

$errors = [];
$userame = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = is_string($_POST['username'] ?? null)
        ? trim($_POST['username'])
        : '';

    $password = is_string($_POST['password'] ?? null)
        ? $_POST['password']
        : '';

    $token = $_POST['csrf_token'] ?? '';

    if ($username === '' || $password === '') {
        $errors[] = 'Enter your username and password.';
    } else {
        
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
