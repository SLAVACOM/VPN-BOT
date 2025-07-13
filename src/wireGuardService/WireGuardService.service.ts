import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as sharp from 'sharp';

@Injectable()
export class WireGuardService {
  private readonly logger = new Logger(WireGuardService.name);

  private readonly apiBase = process.env.WIREGUARD_API;
  private readonly password = process.env.WIREGUARD_PASSWORD;

  private sessionCookie: string | null = null;

  private axiosWithCookie(): AxiosInstance {
    return axios.create({
      headers: {
        'Content-Type': 'application/json',
        ...(this.sessionCookie && { Cookie: this.sessionCookie }),
      },
    });
  }

  private async ensureSession(): Promise<void> {
    if (this.sessionCookie) return;

    const res = await axios.post(
      `${this.apiBase}/session`,
      { password: this.password },
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      },
    );

    const setCookieHeader = res.headers['set-cookie']?.[0];
    const match = setCookieHeader?.match(/connect\.sid=([^;]+);/);
    if (!match) throw new Error('Не удалось получить connect.sid');

    const sid = match[1];
    this.sessionCookie = `connect.sid=${sid}`;
    this.logger.log('Получена новая сессия WireGuard');
  }

  private async requestWithSession<T>(
    fn: (axios: AxiosInstance) => Promise<T>,
  ): Promise<T> {
    try {
      await this.ensureSession();
      return await fn(this.axiosWithCookie());
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        this.logger.warn('Сессия просрочена. Повторная авторизация...');
        this.sessionCookie = null;
        await this.ensureSession();
        return await fn(this.axiosWithCookie());
      }
      throw error;
    }
  }

  async registerClient(name: string) {
    return this.requestWithSession((axios) =>
      axios
        .post(`${this.apiBase}/wireguard/client`, { name })
        .then((res) => res.data),
    );
  }

  async findClientIdByPublicKey(publicKey: string) {
    return this.requestWithSession((axios) =>
      axios.get(`${this.apiBase}/wireguard/client`).then((res) => {
        const list = res.data as any[];
        return list.find((c) => c.publicKey === publicKey)?.id;
      }),
    );
  }

  async getClientQRCode(clientId: string): Promise<Buffer> {
    return this.requestWithSession(async (axios) => {
      const response = await axios.get(
        `${this.apiBase}/wireguard/client/${clientId}/qrcode.svg`,
        { responseType: 'arraybuffer' },
      );
      const svgBuffer = Buffer.from(response.data);

      const pngBuffer = await sharp(svgBuffer)
        .png()
        .resize(512, 512)
        .toBuffer();

      return pngBuffer;
    });
  }

  async getClientConfiguration(clientId: string): Promise<string> {
    return this.requestWithSession(async (axios) => {
      const response = await axios.get(
        `${this.apiBase}/wireguard/client/${clientId}/configuration`,
        { responseType: 'text' },
      );
      return response.data;
    });
  }
}
