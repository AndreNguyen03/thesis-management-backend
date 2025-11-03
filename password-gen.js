import * as bcrypt from 'bcrypt';

async function hashPassword() {
    const password = '123456789';
    const saltRounds = 10;

    const hashed = await bcrypt.hash(password, saltRounds);
    console.log(`Password: ${password} -> Hash: ${hashed}`);
}

hashPassword().catch(console.error);
