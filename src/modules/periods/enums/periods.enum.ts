export enum PeriodStatus {
    OnGoing = 'ongoing',
    Completed = 'completed'
} 
//đây là trạng thái lưu db
//thực tế api trả về sẽ kiểm tra động và cho ra kết quả thuộc ["pending","active","timeout"]
//tương tự với phases
export enum PeriodType {
    THESIS = 'thesis',
    SCIENCE_RESEARCH = 'scientific_research'
}

