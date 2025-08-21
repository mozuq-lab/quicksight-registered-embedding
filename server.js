const express = require('express');
const AWS = require('aws-sdk');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const quicksight = new AWS.QuickSight();

const registeredUsers = new Set();

async function addDashboardPermission(userName) {
  const userArn = `arn:aws:quicksight:${process.env.AWS_REGION}:${process.env.QUICKSIGHT_ACCOUNT_ID}:user/${process.env.QUICKSIGHT_NAMESPACE}/${userName}`;

  const params = {
    AwsAccountId: process.env.QUICKSIGHT_ACCOUNT_ID,
    DashboardId: process.env.QUICKSIGHT_DASHBOARD_ID,
    GrantPermissions: [
      {
        Principal: userArn,
        Actions: [
          'quicksight:DescribeDashboard',
          'quicksight:ListDashboardVersions',
          'quicksight:QueryDashboard'
        ]
      }
    ]
  };

  try {
    const result = await quicksight.updateDashboardPermissions(params).promise();
    console.log(`Dashboard permissions granted to user ${userName}:`, result);
    return result;
  } catch (error) {
    console.error(`Error granting dashboard permissions to user ${userName}:`, error);
    throw error;
  }
}

async function registerUser(userName, email) {
  if (registeredUsers.has(userName)) {
    console.log(`User ${userName} is already registered`);
    return;
  }

  const params = {
    AwsAccountId: process.env.QUICKSIGHT_ACCOUNT_ID,
    Namespace: process.env.QUICKSIGHT_NAMESPACE,
    UserName: userName,
    Email: email,
    IdentityType: 'QUICKSIGHT',
    UserRole: 'READER'
  };

  try {
    const result = await quicksight.registerUser(params).promise();
    registeredUsers.add(userName);
    console.log('User registered successfully:', result);

    // ユーザー登録後にダッシュボードの閲覧許可を追加
    await addDashboardPermission(userName);

    return result;
  } catch (error) {
    if (error.code === 'ResourceExistsException') {
      registeredUsers.add(userName);
      console.log(`User ${userName} already exists in QuickSight`);

      // 既存ユーザーの場合もダッシュボードの閲覧許可を確認・追加
      try {
        await addDashboardPermission(userName);
      } catch (permError) {
        // ダッシュボード権限の追加に失敗してもユーザー登録は成功とみなす
        console.warn(`Failed to add dashboard permission for existing user ${userName}:`, permError.message);
      }

      return;
    }
    console.error('Error registering user:', error);
    throw error;
  }
}

async function generateEmbedUrl(userName) {
  const params = {
    AwsAccountId: process.env.QUICKSIGHT_ACCOUNT_ID,
    UserArn: `arn:aws:quicksight:${process.env.AWS_REGION}:${process.env.QUICKSIGHT_ACCOUNT_ID}:user/${process.env.QUICKSIGHT_NAMESPACE}/${userName}`,
    SessionLifetimeInMinutes: 600,
    ExperienceConfiguration: {
      Dashboard: {
        InitialDashboardId: process.env.QUICKSIGHT_DASHBOARD_ID
      }
    }
  };

  try {
    const result = await quicksight.generateEmbedUrlForRegisteredUser(params).promise();
    console.log(result.EmbedUrl);
    return result.EmbedUrl;
  } catch (error) {
    console.error('Error generating embed URL:', error);
    throw error;
  }
}

app.post('/api/register-user', async (req, res) => {
  try {
    const { userName, email } = req.body;

    if (!userName || !email) {
      return res.status(400).json({ error: 'userName and email are required' });
    }

    await registerUser(userName, email);
    res.json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function removeDashboardPermission(userName) {
  const userArn = `arn:aws:quicksight:${process.env.AWS_REGION}:${process.env.QUICKSIGHT_ACCOUNT_ID}:user/${process.env.QUICKSIGHT_NAMESPACE}/${userName}`;

  const params = {
    AwsAccountId: process.env.QUICKSIGHT_ACCOUNT_ID,
    DashboardId: process.env.QUICKSIGHT_DASHBOARD_ID,
    RevokePermissions: [
      {
        Principal: userArn,
        Actions: [
          'quicksight:DescribeDashboard',
          'quicksight:ListDashboardVersions',
          'quicksight:QueryDashboard'
        ]
      }
    ]
  };

  try {
    const result = await quicksight.updateDashboardPermissions(params).promise();
    console.log(`Dashboard permissions revoked from user ${userName}:`, result);
    return result;
  } catch (error) {
    console.error(`Error revoking dashboard permissions from user ${userName}:`, error);
    throw error;
  }
}

async function deleteUser(userName) {
  const params = {
    AwsAccountId: process.env.QUICKSIGHT_ACCOUNT_ID,
    Namespace: process.env.QUICKSIGHT_NAMESPACE,
    UserName: userName
  };

  try {
    // まずダッシュボード権限を削除
    try {
      await removeDashboardPermission(userName);
    } catch (permError) {
      console.warn(`Failed to remove dashboard permission for user ${userName}:`, permError.message);
    }

    // ユーザーをQuickSightから削除
    const result = await quicksight.deleteUser(params).promise();
    registeredUsers.delete(userName);
    console.log(`User ${userName} deleted successfully:`, result);
    return result;
  } catch (error) {
    console.error(`Error deleting user ${userName}:`, error);
    throw error;
  }
}

app.post('/api/embed-url', async (req, res) => {
  try {
    const { userName, email } = req.body;

    if (!userName || !email) {
      return res.status(400).json({ error: 'userName and email are required' });
    }

    await registerUser(userName, email);

    const embedUrl = await generateEmbedUrl(userName);
    res.json({ embedUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/delete-user', async (req, res) => {
  try {
    const { userName } = req.body;

    if (!userName) {
      return res.status(400).json({ error: 'userName is required' });
    }

    await deleteUser(userName);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}`);
});
