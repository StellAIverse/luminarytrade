import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Keypair } from '@stellar/stellar-sdk';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async validateWallet(loginDto: LoginDto) {
    const { publicKey, message, signature } = loginDto;

    try {
      const keypair = Keypair.fromPublicKey(publicKey);
      const isValid = keypair.verify(Buffer.from(message), Buffer.from(signature, 'base64'));

      if (!isValid) {
        throw new UnauthorizedException('Invalid signature');
      }

      // Check for replay attacks (Optional: verify timestamp in message)
      // const timestamp = parseInt(message.split(':')[1]);
      // if (Date.now() - timestamp > 60000) throw new UnauthorizedException('Request expired');

      // TODO: Find or Create User in DB here
      // const user = await this.usersService.findOrCreate(publicKey);

      return { publicKey };
    } catch (e) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async login(user: any) {
    const payload = { publicKey: user.publicKey, sub: user.publicKey };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
