import type { SchoolPost } from "./publicWebsite";

// Standalone sample articles; never written over school publications.
export const samplePosts: SchoolPost[] = [
  {
    id: -1,
    slug: "mau-lap-ke-hoach-hoc-tap",
    title: "Từ chưa biết code đến ứng dụng đầu tiên",
    excerpt:
      "Hành trình minh họa của người mới học lập trình: bắt đầu bằng những màn hình đơn giản, sửa lỗi từng bước và hoàn thành sản phẩm đầu tay.",
    content:
      "Tình huống minh họa: một người học bắt đầu ngành phần mềm mà chưa từng viết code. Thử thách đầu tiên không phải xây một ứng dụng lớn, mà là hiểu vì sao một nút bấm chưa hoạt động và học cách tìm nguyên nhân.\nTừ trang giới thiệu cá nhân, người học tiếp tục làm danh sách công việc, thêm lưu trữ dữ liệu rồi kết nối API. Mỗi phiên bản đều có phần còn thiếu, nhưng việc ghi lại lỗi và sửa từng bước giúp sản phẩm tiến bộ rõ ràng.\nSản phẩm cuối là một ứng dụng nhỏ có thể dùng thử, kèm hướng dẫn và mô tả những phần tự thực hiện. Giá trị của dự án nằm ở khả năng giải thích cách làm, nhìn nhận giới hạn và biết mình cần học tiếp điều gì.",
    coverImageUrl:
      "https://i.pinimg.com/1200x/90/2a/40/902a4026decc4e6b1f3a701904f4daf1.jpg",
    authorName: "Góc sinh viên",
    isPublished: true,
    isFeatured: false,
    category: "student",
  },
  {
    id: -2,
    slug: "mau-du-an-dau-tay",
    title: "Đồ án đầu tay: khi kiến thức bước ra khỏi lớp học",
    excerpt:
      "Một nhóm học tập minh họa cùng xây dựng website, từ trao đổi ý tưởng đến chia việc, kiểm thử và trình bày sản phẩm.",
    content:
      "Tình huống minh họa: một nhóm chọn làm website đặt lịch cho câu lạc bộ. Ban đầu, mỗi thành viên có một ý tưởng khác nhau về giao diện và chức năng. Nhóm bắt đầu bằng việc thống nhất ai sẽ sử dụng website và ba thao tác quan trọng nhất.\nCác thành viên chia phần việc theo giao diện, dữ liệu và kiểm thử. Khi ghép sản phẩm, nhóm phát hiện nhiều chỗ chưa thống nhất và phải cùng điều chỉnh. Những buổi trao đổi ngắn, có ghi lại quyết định giúp mọi người theo dõi được tiến độ.\nỞ buổi trình bày, nhóm giới thiệu luồng sử dụng, những lỗi đã sửa và phần chưa hoàn thiện. Đồ án không chỉ là một website: đó còn là trải nghiệm phối hợp công việc, tiếp nhận phản hồi và chịu trách nhiệm với phần mình làm.",
    coverImageUrl:
      "https://i.pinimg.com/736x/d1/77/76/d177762ff76ab9e8e4cc04209f845113.jpg",
    authorName: "Góc sinh viên",
    isPublished: true,
    isFeatured: false,
    category: "student",
  },
  {
    id: -3,
    slug: "mau-lam-viec-nhom",
    title: "Tìm tiếng nói riêng qua portfolio thiết kế",
    excerpt:
      "Từ những bản phác thảo đến một bộ nhận diện hoàn chỉnh: câu chuyện minh họa về cách người học thiết kế phát triển ý tưởng và tiếp nhận phản hồi.",
    content:
      "Tình huống minh họa: người học thiết kế chọn xây dựng nhận diện cho một quán cà phê giả định. Thay vì bắt đầu ngay bằng logo, người học xác định khách hàng, cảm xúc thương hiệu và những nơi bộ nhận diện sẽ xuất hiện.\nQua nhiều bản phác thảo, ý tưởng được điều chỉnh về bố cục, màu sắc và kiểu chữ. Phản hồi từ người xem cho thấy một thiết kế đẹp ở kích thước lớn có thể khó đọc khi thu nhỏ. Những thử nghiệm trên bao bì và màn hình giúp kiểm tra ý tưởng thực tế hơn.\nPortfolio ghi lại cả sản phẩm và quá trình ra quyết định: vấn đề ban đầu, các phương án đã thử và lý do lựa chọn. Nhờ vậy, người xem hiểu được tư duy phía sau thiết kế thay vì chỉ thấy những hình ảnh hoàn thiện.",
    coverImageUrl:
      "https://i.pinimg.com/736x/ec/95/8b/ec958b3cbea7410b19fbb304d11d95ef.jpg",
    authorName: "Góc sinh viên",
    isPublished: true,
    isFeatured: false,
    category: "student",
  },
  {
    id: -4,
    slug: "mau-ghi-chep-hieu-qua",
    title: "Một bộ dữ liệu, nhiều câu hỏi đáng khám phá",
    excerpt:
      "Trải nghiệm minh họa khi học dữ liệu: từ bảng số liệu chưa hoàn chỉnh đến biểu đồ dễ hiểu và một kết luận có căn cứ.",
    content:
      "Tình huống minh họa: một nhóm học phân tích dữ liệu chọn bộ dữ liệu công khai về thói quen sử dụng dịch vụ. Những dòng bị thiếu và cách ghi không thống nhất khiến kết quả ban đầu khác với dự đoán của nhóm.\nTrước khi dựng biểu đồ, nhóm kiểm tra nguồn, làm sạch dữ liệu và ghi lại những giả định đã sử dụng. Các câu hỏi cũng được thu hẹp để có thể trả lời bằng dữ liệu đang có, thay vì cố chứng minh một kết luận định sẵn.\nBáo cáo cuối trình bày biểu đồ, cách xử lý dữ liệu và những điều chưa thể khẳng định. Bài học quan trọng là một kết quả hữu ích cần rõ ràng về nguồn dữ liệu, phương pháp và giới hạn.",
    coverImageUrl:
      "https://i.pinimg.com/736x/b2/b9/7f/b2b97fab420adedeb0f6c43592a6105a.jpg",
    authorName: "Góc sinh viên",
    isPublished: true,
    isFeatured: false,
    category: "student",
  },
  {
    id: -5,
    slug: "mau-ho-so-thuc-tap",
    title: "Từ dự án trên lớp đến hồ sơ ứng tuyển",
    excerpt:
      "Hành trình minh họa về cách chọn lọc sản phẩm học tập, làm rõ vai trò cá nhân và chuẩn bị trao đổi trong buổi phỏng vấn.",
    content:
      "Tình huống minh họa: khi chuẩn bị tìm vị trí thực tập, người học có nhiều bài tập nhưng chưa biết đưa phần nào vào hồ sơ. Việc đầu tiên là chọn những dự án liên quan đến vị trí muốn tìm hiểu, thay vì liệt kê tất cả công cụ từng sử dụng.\nMỗi dự án được trình bày bằng vấn đề cần giải quyết, vai trò cá nhân, sản phẩm có thể xem và điều rút ra sau khi thực hiện. Những phần làm theo nhóm được ghi rõ để người đọc hiểu đúng đóng góp của từng thành viên.\nKhi tập trình bày sản phẩm, người học nhận ra những kiến thức cần ôn lại. Hồ sơ trở thành điểm bắt đầu cho cuộc trao đổi về khả năng và mục tiêu học tiếp, không phải lời cam kết về một kết quả tuyển dụng.",
    coverImageUrl:
      "https://i.pinimg.com/736x/ce/46/73/ce46739a1ca3a2dcf46e53f414ecaecd.jpg",
    authorName: "Góc sinh viên",
    isPublished: true,
    isFeatured: false,
    category: "student",
  },
];

export function shufflePosts(posts: SchoolPost[]): SchoolPost[] {
  const result = [...posts];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
