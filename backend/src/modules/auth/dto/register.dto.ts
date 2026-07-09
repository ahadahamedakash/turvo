import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'test@gmail.com',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    description: 'User first name',
    example: 'Mark',
  })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Austin',
  })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(50)
  lastName!: string;

  @ApiProperty({
    description: 'User address',
    example: '156 North Chashara, Narayanganj, Bangladesh',
  })
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @MaxLength(255)
  address!: string;

  @ApiProperty({
    description: 'User phone number',
    example: '01636333999',
  })
  @IsString()
  @Matches(/^01[3-9]\d{8}$/, {
    message: 'Phone number must be a valid Bangladeshi mobile number',
  })
  phone!: string;

  @ApiProperty({
    description: 'User password',
    example: 'StrongP@sso0rd!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, {
    message: 'Password must be at least 8 characters long',
  })
  @MaxLength(20, {
    message: 'Password cannot exceed 20 characters',
  })
  @Matches(/^(?=.*[A-Z])(?=.*\d).*$/, {
    message:
      'Password must contain at least one uppercase letter and one number',
  })
  password!: string;
}
