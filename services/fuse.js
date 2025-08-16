import axios from 'axios';

const FUSE_API = 'https://api.fuse.io/api';
const API_KEY = 'pk_b1DcxPMnCplBgj55ZSqOv_c_';
const SECRET_KEY = 'sk_TItAUCr7WTI8jEucyOkJF80p';

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
  Authorization: `Bearer ${SECRET_KEY}`,
};

export const createWallet = async (username) => {
  try {
    const response = await axios.post(
      `${FUSE_API}/v1/wallets`,
      { externalId: username },
      { headers }
    );
    return response.data;
  } catch (err) {
    console.error('🚨 Error creating wallet:', err.response?.data || err.message);
    throw err;
  }
};

export const getBalance = async (walletAddress) => {
  try {
    const res = await axios.get(`${FUSE_API}/v1/wallets/${walletAddress}/balance`, {
      headers,
    });
    return res.data;
  } catch (err) {
    console.error('🚨 Error fetching balance:', err.response?.data || err.message);
    throw err;
  }
};
