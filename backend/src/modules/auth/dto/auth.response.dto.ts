import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Access token for authentication',
    example:
      'adsf#a3d2f13asd12f32adsfadsfasdsadfadsfaldsjkflakdjflkjdflkjasd;flkjsldfjJSF:LSKDJflkajsdflj',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token for authentication',
    example:
      'adsf#a3d2f13asd12f32adsfadsfasdsadfadsfaldsjkflakdjflkjdflkjasd;flkjsldfjJSF:LSKDJflkajsdflj',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Authenticated user information',
    example: {
      id: 'user-1256456',
      email: 'user@gmail.com',
    },
  })
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}
