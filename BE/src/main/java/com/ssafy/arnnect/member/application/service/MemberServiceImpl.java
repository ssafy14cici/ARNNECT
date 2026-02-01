package com.ssafy.arnnect.member.application.service;

import com.ssafy.arnnect.common.exception.BusinessException;
import com.ssafy.arnnect.common.exception.ErrorCode;
import com.ssafy.arnnect.common.file.FileStorageService;
import com.ssafy.arnnect.common.file.FileType;
import com.ssafy.arnnect.common.util.FileNameGenerator;
import com.ssafy.arnnect.member.application.dto.request.CreateArtistRequest;
import com.ssafy.arnnect.member.application.dto.request.CreateMemberRequest;
import com.ssafy.arnnect.member.application.dto.request.UpdateArtistRequest;
import com.ssafy.arnnect.member.application.dto.request.UpdateMemberRequest;
import com.ssafy.arnnect.member.application.dto.response.MemberInfoResponse;
import com.ssafy.arnnect.member.application.dto.response.MyInfoResponse;
import com.ssafy.arnnect.member.domain.entity.Artist;
import com.ssafy.arnnect.member.domain.entity.Member;
import com.ssafy.arnnect.member.domain.entity.UserRole;
import com.ssafy.arnnect.member.repository.ArtistRepository;
import com.ssafy.arnnect.member.repository.MemberRepository;
import com.ssafy.arnnect.security.SecurityUtil;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService{

    private final MemberRepository memberRepo;
    private final ArtistRepository artistRepo;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;

    @Override
    @Transactional
    public void createMember(CreateMemberRequest request, MultipartFile file) throws IOException {
        Member member = request.toMemberEntity();
        member.encodePassword(passwordEncoder.encode(member.getPassword()));
        if(file != null) {
            saveProfileImage(member, file);
        }
        log.info("사용자 회원가입 : member => {}",member.toString());
        memberRepo.save(member);
    }

    @Override
    @Transactional
    public void createArtist(CreateArtistRequest request, MultipartFile file) throws IOException {
        Member member = request.toMemberEntity();
        member.encodePassword(passwordEncoder.encode(member.getPassword()));
        if(file != null) {
            saveProfileImage(member, file);
        }
        log.info("예술가 회원가입 : member => {}",member.toString());

        Artist artist = request.toArtistEntity(memberRepo.save(member));
        artistRepo.save(artist);
    }

    @Override
    @Transactional
    public void updateMember(UpdateMemberRequest request, MultipartFile file) throws IOException{
        String memberUuid = SecurityUtil.getCurrentMemberUuid();
        Member member = memberRepo.findByMemberUuid(memberUuid)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (request.getPassword() != null) {
            member.encodePassword(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getNickname() != null) {
            member.setNickname(request.getNickname());
        }

        if (file != null) {
            updateProfileImage(member, file);
        }

        memberRepo.save(member);
    }

    @Override
    @Transactional
    public void updateArtist(UpdateArtistRequest request, MultipartFile file) throws IOException{
        String memberUuid = SecurityUtil.getCurrentMemberUuid();

        // Artist 조회 (Member 포함)
        Artist artist = artistRepo.findByMember_MemberUuid(memberUuid)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        Member member = artist.getMember();

        // Member 정보 수정
        if (request.getPassword() != null) {
            member.encodePassword(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getNickname() != null) {
            member.setNickname(request.getNickname());
        }

        // Artist 정보 수정
        if (request.getFieldId() != null) {
            artist.setFieldId(request.getFieldId());
        }
        if (request.getGenreId() != null) {
            artist.setGenreId(request.getGenreId());
        }
        if (request.getDebutYear() != null) {
            artist.setDebutYear(request.getDebutYear());
        }
        if (request.getSnsPage() != null) {
            artist.setSnsPage(request.getSnsPage());
        }
        if (request.getAffiliation() != null) {
            artist.setAffiliation(request.getAffiliation());
        }
        if (request.getIntroduction() != null) {
            artist.setIntroduction(request.getIntroduction());
        }

        // 파일 처리
        if (file != null) {
            updateProfileImage(member, file);
        }

        memberRepo.save(member);
        artistRepo.save(artist);
    }

    @Override
    @Transactional
    public void deleteMember(String memberUuid) throws IOException {
        Member member = memberRepo.findByMemberUuid(memberUuid)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // Soft Delete
        member.setIsDeleted(true);
        member.setDeletedAt(LocalDateTime.now());

        // 프로필 이미지 삭제 (선택)
        if (member.getStoredProfileImage() != null) {
            fileStorageService.deleteFile(member.getStoredProfileImage(), FileType.PROFILE);
        }

        memberRepo.save(member);
    }

    @Override
    public MyInfoResponse getMyInfo(String memberUuid, UserRole role) {
        if(UserRole.GENERAL.equals(role)){
            return MyInfoResponse.fromMember(memberRepo.findByMemberUuid(memberUuid).orElseThrow(
                    ()-> new BusinessException(ErrorCode.USER_NOT_FOUND)
            ));
        }else{
            return MyInfoResponse.fromArtist(artistRepo.findByMember_MemberUuid(memberUuid).orElseThrow(
                    ()->new BusinessException(ErrorCode.USER_NOT_FOUND)
            ));
        }
    }

    @Override
    public MemberInfoResponse getMemberInfo(String myUuid,String memberUuid) {
        return memberRepo.findMemberInfo(memberUuid,memberRepo.findByMemberUuid(memberUuid).orElseThrow(
                ()-> new BusinessException(ErrorCode.USER_NOT_FOUND)).getMemberId());
    }

    public Long getMemberId(String memberUuid){
        return memberRepo.findByMemberUuid(memberUuid).orElseThrow(
                ()-> new BusinessException(ErrorCode.USER_NOT_FOUND)).getMemberId();
    }

    // 프로필 이미지 저장
    private void saveProfileImage(Member member, MultipartFile file) throws IOException {
        FileNameGenerator generator = new FileNameGenerator();
        String originalFilename = file.getOriginalFilename();
        String storedName = generator.generateFileName(originalFilename, member.getMemberUuid());

        member.setOriginalProfileName(originalFilename);
        member.setStoredProfileImage(storedName);
        fileStorageService.saveFile(file, storedName, FileType.PROFILE);
    }

    // 프로필 이미지 업데이트
    private void updateProfileImage(Member member, MultipartFile file) throws IOException {
        // 기존 파일 삭제
        String oldStoredName = member.getStoredProfileImage();
        if (oldStoredName != null) {
            fileStorageService.deleteFile(oldStoredName, FileType.PROFILE);
        }

        // 새 파일 저장
        saveProfileImage(member, file);
    }
}
