import { Prop, Schema } from "@nestjs/mongoose";
import mongoose from "mongoose";

// schemas/todolist.schema.ts
@Schema({ timestamps: true, collection: 'todolists' })
export class ToDoList {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true, index: true })
  topicId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ type: Number, required: true }) // Dùng để sắp xếp thứ tự cột (lexorank hoặc int)
  position: number;

  @Prop()
  color: string;
}