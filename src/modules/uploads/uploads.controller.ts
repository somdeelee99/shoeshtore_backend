import { BadRequestException, Controller, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

@ApiTags('Admin / Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
@Controller('admin/uploads')
export class UploadsController {
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED.includes(extname(file.originalname).toLowerCase())) {
          return cb(new BadRequestException('ຮອງຮັບສະເພາະຮູບພາບ jpg, png, webp, gif'), false);
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFiles() files: Express.Multer.File[]) {
    const base = process.env.PUBLIC_UPLOAD_URL ?? 'http://localhost:4000/uploads';
    return {
      files: (files ?? []).map((f) => ({ url: `${base}/${f.filename}`, filename: f.filename, size: f.size })),
    };
  }
}
